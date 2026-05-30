// SPDX-License-Identifier: GPL-3.0-or-later
import { Prisma, prisma } from '@gira/db';
import { rankBetween } from '@gira/domain';
import { moveIssueSchema } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { badRequest } from '../../lib/http-error.js';
import { assertCanAccessProject, assertCanWrite } from '../../lib/scope.js';
import { toIssueView, toStatusView } from '../../lib/views.js';
import { issueInclude, loadIssueOr404 } from '../issues/service.js';
import { getProjectByKeyOr404 } from '../projects/service.js';

/**
 * Run a transaction at Serializable isolation, retrying on write-conflict (Prisma
 * P2034 / Postgres 40001). Used by the board move so two concurrent drops onto the
 * same gap can't both read the same neighbour ranks and compute a colliding rank —
 * Postgres SSI aborts one and we recompute against the committed state.
 */
async function runSerializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'P2034' && attempt < 4) continue; // serialization failure — retry
      throw e;
    }
  }
}

export async function boardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/projects/:key/board', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(currentUser(req), project);

    const [statuses, issues, loggedByIssue] = await Promise.all([
      prisma.status.findMany({ where: { projectId: project.id }, orderBy: { order: 'asc' } }),
      prisma.issue.findMany({
        where: { projectId: project.id },
        include: issueInclude,
        orderBy: { rank: 'asc' },
      }),
      prisma.worklog.groupBy({
        by: ['issueId'],
        where: { issue: { projectId: project.id } },
        _sum: { minutes: true },
      }),
    ]);

    const loggedMinutes = new Map(loggedByIssue.map((g) => [g.issueId, g._sum.minutes ?? 0]));
    const toCardView = (i: (typeof issues)[number]) => ({
      ...toIssueView(i),
      loggedMinutes: loggedMinutes.get(i.id) ?? 0,
    });

    const columns = statuses.map((s) => ({
      status: toStatusView(s),
      issues: issues.filter((i) => i.statusId === s.id).map(toCardView),
    }));
    return { projectKey: key, columns };
  });

  app.post('/issues/:key/move', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { key } = req.params as { key: string };
    const issue = await loadIssueOr404(key);
    assertCanAccessProject(user, { clientId: issue.project.clientId });
    const input = moveIssueSchema.parse(req.body);

    const targetStatusId = input.statusId ?? issue.statusId;
    let targetStatus = null;
    if (input.statusId && input.statusId !== issue.statusId) {
      targetStatus = await prisma.status.findUnique({ where: { id: input.statusId } });
      if (!targetStatus || targetStatus.projectId !== issue.projectId) {
        throw badRequest('statusId does not belong to this project');
      }
    }

    let closedAt: Date | null | undefined;
    if (targetStatus) {
      closedAt = targetStatus.category === 'done' ? (issue.closedAt ?? new Date()) : null;
    }

    // Read the drop neighbours and write the new rank INSIDE one serializable
    // transaction so concurrent drops onto the same gap can't collide on a rank.
    const updated = await runSerializable(async (tx) => {
      const rankOf = async (k?: string): Promise<string | null> =>
        k ? ((await tx.issue.findUnique({ where: { key: k }, select: { rank: true } }))?.rank ?? null) : null;
      const endOfColumn = async (): Promise<string | null> =>
        (
          await tx.issue.findFirst({
            where: { projectId: issue.projectId, statusId: targetStatusId, key: { not: key } },
            orderBy: { rank: 'desc' },
            select: { rank: true },
          })
        )?.rank ?? null;

      const beforeRank = await rankOf(input.beforeId);
      const afterRank = await rankOf(input.afterId);
      let rank: string;
      try {
        rank =
          beforeRank != null || afterRank != null
            ? rankBetween(beforeRank, afterRank)
            : rankBetween(await endOfColumn(), null);
      } catch {
        // Neighbours didn't bracket cleanly (e.g. stale) — append to the column end.
        rank = rankBetween(await endOfColumn(), null);
      }

      // Resolve rank collisions: two concurrent drops onto the same gap compute the
      // same rank (rankBetween is deterministic). The findFirst-by-rank read also
      // gives Postgres SSI the predicate dependency it needs to serialize the two
      // writers — the loser aborts with P2034, retries on a fresh snapshot, sees the
      // sibling's committed rank here, and re-brackets to a distinct value.
      for (let i = 0; i < 64; i++) {
        const clash = await tx.issue.findFirst({
          where: { projectId: issue.projectId, statusId: targetStatusId, rank, key: { not: key } },
          select: { rank: true },
        });
        if (!clash) break;
        const next = await tx.issue.findFirst({
          where: { projectId: issue.projectId, statusId: targetStatusId, rank: { gt: rank }, key: { not: key } },
          orderBy: { rank: 'asc' },
          select: { rank: true },
        });
        rank = rankBetween(clash.rank, next?.rank ?? null);
      }

      const data: Prisma.IssueUpdateInput = { rank };
      if (input.statusId) data.status = { connect: { id: input.statusId } };
      if (closedAt !== undefined) data.closedAt = closedAt;
      if ('sprintId' in input) {
        data.sprint = input.sprintId ? { connect: { id: input.sprintId } } : { disconnect: true };
      }

      const u = await tx.issue.update({ where: { key }, data, include: issueInclude });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'issue.move',
        entityType: 'Issue',
        entityId: issue.id,
        before: { statusId: issue.statusId, rank: issue.rank, sprintId: issue.sprintId },
        after: { statusId: u.statusId, rank: u.rank, sprintId: u.sprintId },
      });
      return u;
    });
    return toIssueView(updated);
  });
}
