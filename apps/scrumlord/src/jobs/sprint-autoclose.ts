// SPDX-License-Identifier: GPL-3.0-or-later
// sprint-autoclose: close active sprints whose endDate has passed, computing
// completedPoints via velocity() and snapshotting it — mirroring the manual
// POST /sprints/:id/close so the two paths can never diverge.

import { prisma } from '@gira/db';
import { velocity } from '@gira/domain';

/**
 * Find every sprint with state='active' AND endDate < now. For each, in one
 * transaction: snapshot velocity, return unfinished (non-done) issues to the
 * backlog (sprintId=null), then set state='closed' + completedPoints.
 *
 * Detaching non-done issues is the critical parity with the API close handler —
 * without it they are orphaned on a closed sprint and vanish from both the board
 * and the backlog. Each sprint runs in its own try/catch so one failure can't
 * abort the whole batch. Safe to call repeatedly — closed sprints are ignored.
 */
export async function runSprintAutoclose(now = new Date()): Promise<number> {
  const expiredSprints = await prisma.sprint.findMany({
    where: {
      state: 'active',
      endDate: { lt: now },
    },
    select: { id: true, committedPoints: true },
  });

  if (expiredSprints.length === 0) {
    return 0;
  }

  let closed = 0;

  for (const sprint of expiredSprints) {
    try {
      const completedPoints = await prisma.$transaction(async (tx) => {
        const issues = await tx.issue.findMany({
          where: { sprintId: sprint.id },
          include: { status: { select: { category: true } } },
        });
        const v = velocity(
          issues.map((i) => ({ storyPoints: i.storyPoints, statusCategory: i.status.category })),
          sprint.committedPoints,
        );
        // Return unfinished issues to the backlog before closing.
        await tx.issue.updateMany({
          where: { sprintId: sprint.id, status: { category: { not: 'done' } } },
          data: { sprintId: null },
        });
        await tx.sprint.update({
          where: { id: sprint.id },
          data: { state: 'closed', completedPoints: v.completedPoints },
        });
        return v.completedPoints;
      });

      console.log(
        `[sprint-autoclose] Sprint ${sprint.id} closed — completedPoints=${completedPoints}`,
      );
      closed++;
    } catch (err) {
      // Per-row isolation: a single bad sprint must not abort the batch.
      console.error('[sprint-autoclose] sprint failed to close', { sprintId: sprint.id, err });
    }
  }

  return closed;
}
