// SPDX-License-Identifier: GPL-3.0-or-later
// sprint-autoclose: close active sprints whose endDate has passed,
// computing completedPoints via velocity() and snapshotting it.

import { prisma } from '@gira/db';
import { velocity } from '@gira/domain';

/**
 * Find every sprint with state='active' AND endDate < now.
 * For each, load its issues with their status category, compute completedPoints
 * via velocity(), then update state='closed' + completedPoints.
 *
 * Safe to call multiple times — already-closed sprints are ignored.
 */
export async function runSprintAutoclose(now = new Date()): Promise<number> {
  const expiredSprints = await prisma.sprint.findMany({
    where: {
      state: 'active',
      endDate: { lt: now },
    },
    select: {
      id: true,
      committedPoints: true,
      issues: {
        select: {
          storyPoints: true,
          status: {
            select: { category: true },
          },
        },
      },
    },
  });

  if (expiredSprints.length === 0) {
    return 0;
  }

  let closed = 0;

  for (const sprint of expiredSprints) {
    const issues = sprint.issues.map((i: typeof sprint.issues[number]) => ({
      storyPoints: i.storyPoints,
      statusCategory: i.status.category as 'todo' | 'in_progress' | 'done',
    }));

    const { completedPoints } = velocity(issues, sprint.committedPoints);

    await prisma.sprint.update({
      where: { id: sprint.id },
      data: {
        state: 'closed',
        completedPoints,
      },
    });

    console.log(
      `[sprint-autoclose] Sprint ${sprint.id} closed — completedPoints=${completedPoints}`,
    );
    closed++;
  }

  return closed;
}
