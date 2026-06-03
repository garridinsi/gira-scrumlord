// SPDX-License-Identifier: GPL-3.0-or-later
// timer-reap: auto-stop timers that have been running longer than 12 hours.
// Creates a capped Worklog (max 720 minutes) and deletes the dangling Timer.

import { prisma } from '@gira/db';

const REAP_AFTER_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const MAX_MINUTES = 720; // 12 hours in minutes — hard cap for billing safety

/**
 * Find all timers whose startedAt is older than 12 hours ago. For each, in one
 * transaction: delete the Timer first, then create the capped Worklog.
 *
 * Delete-first is the idempotency guard: if a concurrent API stop already claimed
 * this timer, the delete throws (record not found), the transaction rolls back,
 * and NO duplicate worklog is written — so the same elapsed time can't be billed
 * twice. Per-timer try/catch keeps one already-stopped timer from aborting the batch.
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

    try {
      await prisma.$transaction(async (tx) => {
        // Delete-first: a concurrent API stop that already removed this timer makes
        // the delete throw, rolling the whole tx back (no double worklog).
        await tx.timer.delete({ where: { id: timer.id } });
        await tx.worklog.create({
          data: {
            issueId: timer.issueId,
            userId: timer.userId,
            minutes,
            billable: true,
            note: 'auto-stopped by scrumlord',
            startedAt: timer.startedAt,
          },
        });
      });

      console.log(
        `[timer-reap] Timer ${timer.id} reaped — userId=${timer.userId} minutes=${minutes} (capped=${minutes === MAX_MINUTES})`,
      );
      reaped++;
    } catch (err) {
      // Per-timer isolation: an already-stopped timer (or any single failure)
      // must not abort the rest of the batch.
      console.error('[timer-reap] timer skipped', { timerId: timer.id, err });
    }
  }

  return reaped;
}
