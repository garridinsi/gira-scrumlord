// SPDX-License-Identifier: GPL-3.0-or-later
import { Prisma, prisma } from '@gira/db';
import { NoRankSpaceError, rankBetween } from '@gira/domain';
import { moveIssueSchema } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { badRequest } from '../../lib/http-error.js';
import { assertCanAccessProject, assertCanWrite } from '../../lib/scope.js';
import { runSerializable } from '../../lib/tx.js';
import { toIssueView, toStatusView } from '../../lib/views.js';
import { issueInclude, loadIssueOr404 } from '../issues/service.js';
import { getProjectByKeyOr404 } from '../projects/service.js';

/** A spread of distinct, strictly-ascending ranks for a freshly rebalanced column. */
function freshRanks(n: number): string[] {
  const out: string[] = [];
  let prev: string | null = null;
  for (let i = 0; i < n; i++) {
    const r = rankBetween(prev, null);
    out.push(r);
    prev = r;
  }
  return out;
}

/**
 * Decide the moved issue's new rank within its target column, INSIDE the given
 * transaction. Normally a fractional rank between the drop neighbours; if no value
 * exists between them (immediate neighbours / inserting before the first rank) or
 * the column is too dense, the whole column is rebalanced to evenly-spaced ranks
 * and the card placed at the drop index. Returns the moved card's rank. Sibling
 * rows are updated here only on the rebalance path.
 */
async function placeInColumn(
  tx: Prisma.TransactionClient,
  projectId: string,
  statusId: string,
  movedKey: string,
  beforeKey?: string,
  afterKey?: string,
): Promise<string> {
  const rankOf = async (k?: string): Promise<string | null> =>
    k ? ((await tx.issue.findUnique({ where: { key: k }, select: { rank: true } }))?.rank ?? null) : null;
  const endOfColumn = async (): Promise<string | null> =>
    (
      await tx.issue.findFirst({
        where: { projectId, statusId, key: { not: movedKey } },
        orderBy: { rank: 'desc' },
        select: { rank: true },
      })
    )?.rank ?? null;

  const beforeRank = await rankOf(beforeKey);
  const afterRank = await rankOf(afterKey);

  try {
    let rank =
      beforeRank != null || afterRank != null
        ? rankBetween(beforeRank, afterRank)
        : rankBetween(await endOfColumn(), null);

    // Resolve rank collisions. The findFirst-by-rank read also gives Postgres SSI
    // the predicate dependency that serializes two concurrent drops onto the same
    // gap (the loser aborts P2034, retries, and re-brackets here).
    for (let i = 0; i < 64; i++) {
      const clash = await tx.issue.findFirst({
        where: { projectId, statusId, rank, key: { not: movedKey } },
        select: { rank: true },
      });
      if (!clash) return rank;
      const next = await tx.issue.findFirst({
        where: { projectId, statusId, rank: { gt: rank }, key: { not: movedKey } },
        orderBy: { rank: 'asc' },
        select: { rank: true },
      });
      rank = rankBetween(clash.rank, next?.rank ?? null); // may throw NoRankSpaceError
    }
    // 64 iterations without a free slot — fall through to a rebalance.
  } catch (e) {
    if (!(e instanceof NoRankSpaceError)) throw e;
    // No value between the neighbours — rebalance below.
  }

  // Rebalance: assign fresh evenly-ascending ranks to the whole target column,
  // inserting the moved card at the requested drop position.
  const others = await tx.issue.findMany({
    where: { projectId, statusId, key: { not: movedKey } },
    orderBy: { rank: 'asc' },
    select: { id: true, key: true },
  });
  let idx = others.length; // default: end of column
  if (afterKey) {
    const j = others.findIndex((o) => o.key === afterKey);
    if (j >= 0) idx = j;
  } else if (beforeKey) {
    const j = others.findIndex((o) => o.key === beforeKey);
    if (j >= 0) idx = j + 1;
  }

  const fresh = freshRanks(others.length + 1);
  for (let pos = 0; pos < others.length + 1; pos++) {
    if (pos === idx) continue; // reserved for the moved card
    const other = others[pos < idx ? pos : pos - 1]!;
    await tx.issue.update({ where: { id: other.id }, data: { rank: fresh[pos]! } });
  }
  return fresh[idx]!;
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

    // A connected sprint must belong to this issue's project — mirror the PATCH
    // /issues guard, otherwise a drag could graft another project's sprint onto the
    // issue (cross-project data-integrity hole).
    if (input.sprintId) {
      const s = await prisma.sprint.findUnique({
        where: { id: input.sprintId },
        select: { projectId: true },
      });
      if (!s || s.projectId !== issue.projectId) throw badRequest('invalid sprintId');
    }

    const targetStatusId = input.statusId ?? issue.statusId;
    let targetStatus = null;
    if (input.statusId && input.statusId !== issue.statusId) {
      targetStatus = await prisma.status.findUnique({ where: { id: input.statusId } });
      if (!targetStatus || targetStatus.projectId !== issue.projectId) {
        throw badRequest('statusId does not belong to this project');
      }
    }

    let closedAt: Date | null | undefined;
    let reopened = false;
    if (targetStatus) {
      closedAt = targetStatus.category === 'done' ? (issue.closedAt ?? new Date()) : null;
      // D2: dragging a done card back to an open column is a reopen.
      reopened = issue.status.category === 'done' && targetStatus.category !== 'done';
    }

    // Compute the new rank and write it INSIDE one serializable transaction so
    // concurrent drops onto the same gap can't collide; placeInColumn rebalances
    // the column if the neighbours admit no value between them.
    const updated = await runSerializable(async (tx) => {
      const rank = await placeInColumn(
        tx,
        issue.projectId,
        targetStatusId,
        key,
        input.beforeId,
        input.afterId,
      );

      const data: Prisma.IssueUpdateInput = { rank };
      if (input.statusId) data.status = { connect: { id: input.statusId } };
      if (closedAt !== undefined) data.closedAt = closedAt;
      if (reopened) data.reopenCount = { increment: 1 };
      if ('sprintId' in input) {
        data.sprint = input.sprintId ? { connect: { id: input.sprintId } } : { disconnect: true };
      }

      const u = await tx.issue.update({ where: { key }, data, include: issueInclude });
      // A drag that changes status must emit the same event the PATCH path does,
      // else dragging a card to Done never notifies the watchers/reporter.
      if (targetStatus) {
        await tx.outbox.create({
          data: {
            type: 'issue.status_changed',
            payload: {
              issueKey: u.key,
              projectKey: issue.project.key,
              title: u.title,
              fromStatusId: issue.statusId,
              toStatusId: u.statusId,
              actorId: user.id,
            },
          },
        });
      }
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
