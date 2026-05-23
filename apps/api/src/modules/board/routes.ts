// SPDX-License-Identifier: GPL-3.0-or-later
import { type Prisma, prisma } from '@gira/db';
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

async function rankOfKey(key?: string): Promise<string | null> {
  if (!key) return null;
  const issue = await prisma.issue.findUnique({ where: { key }, select: { rank: true } });
  return issue?.rank ?? null;
}

async function lastRankInColumn(
  projectId: string,
  statusId: string,
  excludeKey: string,
): Promise<string | null> {
  const last = await prisma.issue.findFirst({
    where: { projectId, statusId, key: { not: excludeKey } },
    orderBy: { rank: 'desc' },
    select: { rank: true },
  });
  return last?.rank ?? null;
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

    // Rank from the drop neighbours; fall back to end-of-column if they don't
    // bracket cleanly (e.g. stale neighbours).
    const beforeRank = await rankOfKey(input.beforeId);
    const afterRank = await rankOfKey(input.afterId);
    let rank: string;
    try {
      rank =
        beforeRank != null || afterRank != null
          ? rankBetween(beforeRank, afterRank)
          : rankBetween(await lastRankInColumn(issue.projectId, targetStatusId, key), null);
    } catch {
      rank = rankBetween(await lastRankInColumn(issue.projectId, targetStatusId, key), null);
    }

    let closedAt: Date | null | undefined;
    if (targetStatus) {
      closedAt = targetStatus.category === 'done' ? (issue.closedAt ?? new Date()) : null;
    }

    const data: Prisma.IssueUpdateInput = { rank };
    if (input.statusId) data.status = { connect: { id: input.statusId } };
    if (closedAt !== undefined) data.closedAt = closedAt;
    if ('sprintId' in input) {
      data.sprint = input.sprintId ? { connect: { id: input.sprintId } } : { disconnect: true };
    }

    const updated = await prisma.$transaction(async (tx) => {
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
