// SPDX-License-Identifier: GPL-3.0-or-later
// timer-reap: auto-stop timers that have been running longer than 12 hours.
// Creates a capped Worklog (max 720 minutes) and deletes the dangling Timer.

import { prisma } from '@gira/db';

const REAP_AFTER_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const MAX_MINUTES = 720; // 12 hours in minutes — hard cap for billing safety

/**
 * Find all timers whose startedAt is older than 12 hours ago.
 * For each:
 *   1. Compute elapsed minutes, capped at 720.
 *   2. Create a Worklog (billable=true, note="auto-stopped by scrumlord").
 *   3. Delete the Timer.
 *
 * Returns the number of timers reaped.
 */
export async function runTimerReap(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - REAP_AFTER_MS);

  const staleTimers = await prisma.timer.findMany({
    where: {
      startedAt: { lt: cutoff },
    },
    select: {
      id: true,
      issueId: true,
      userId: true,
      startedAt: true,
    },
  });

  if (staleTimers.length === 0) {
    return 0;
  }

  let reaped = 0;

  for (const timer of staleTimers) {
    const elapsedMs = now.getTime() - timer.startedAt.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60_000);
    const minutes = Math.min(elapsedMinutes, MAX_MINUTES);

    await prisma.$transaction([
      prisma.worklog.create({
        data: {
          issueId: timer.issueId,
          userId: timer.userId,
          minutes,
          billable: true,
          note: 'auto-stopped by scrumlord',
          startedAt: timer.startedAt,
        },
      }),
      prisma.timer.delete({
        where: { id: timer.id },
      }),
    ]);

    console.log(
      `[timer-reap] Timer ${timer.id} reaped — userId=${timer.userId} minutes=${minutes} (capped=${minutes === MAX_MINUTES})`,
    );
    reaped++;
  }

  return reaped;
}
