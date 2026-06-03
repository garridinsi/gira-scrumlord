// SPDX-License-Identifier: GPL-3.0-or-later
// velocity-snapshot: recompute completedPoints for all active sprints
// and store the running snapshot. Called every 5 minutes while the sprint lives.

import { prisma } from '@gira/db';
import { velocity } from '@gira/domain';

/**
 * For every active sprint, recompute completedPoints from current issues and
 * update the sprint record. committedPoints is left unchanged (it was snapshotted
 * at sprint start via the API).
 *
 * Returns the number of sprints snapshotted.
 */
export async function runVelocitySnapshot(): Promise<number> {
  const activeSprints = await prisma.sprint.findMany({
    where: { state: 'active' },
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

  if (activeSprints.length === 0) {
    return 0;
  }

  let snapshotted = 0;

  for (const sprint of activeSprints) {
    const issues = sprint.issues.map((i: (typeof sprint.issues)[number]) => ({
      storyPoints: i.storyPoints,
      statusCategory: i.status.category as 'todo' | 'in_progress' | 'done',
    }));

    const { completedPoints } = velocity(issues, sprint.committedPoints);

    await prisma.sprint.update({
      where: { id: sprint.id },
      data: { completedPoints },
    });

    snapshotted++;
  }

  if (snapshotted > 0) {
    console.log(`[velocity-snapshot] snapshotted ${snapshotted} active sprint(s)`);
  }

  return snapshotted;
}
