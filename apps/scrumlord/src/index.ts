// SPDX-License-Identifier: GPL-3.0-or-later
// scrumlord — the daemon that governs the dailies.
// One ticket to rule them all. Sauron watches. The tornado is you at end of quarter.

import PgBoss from 'pg-boss';
import { DATABASE_URL } from './config.js';
import { runSprintAutoclose } from './jobs/sprint-autoclose.js';
import { runTimerReap } from './jobs/timer-reap.js';
import { runOutboxDispatch } from './jobs/outbox-dispatch.js';
import { runVelocitySnapshot } from './jobs/velocity-snapshot.js';

// ── Queue names ─────────────────────────────────────────────────────────────
const QUEUE_OUTBOX_DISPATCH = 'outbox-dispatch';
const QUEUE_SPRINT_AUTOCLOSE = 'sprint-autoclose';
const QUEUE_VELOCITY_SNAPSHOT = 'velocity-snapshot';
const QUEUE_TIMER_REAP = 'timer-reap';

// ── Cron cadences ────────────────────────────────────────────────────────────
// outbox-dispatch:    every minute  (* * * * *)
// sprint-autoclose:   every 5 min   (*/5 * * * *)
// velocity-snapshot:  every 5 min   (*/5 * * * *)
// timer-reap:         every 10 min  (*/10 * * * *)

async function main(): Promise<void> {
  const boss = new PgBoss(DATABASE_URL);

  boss.on('error', (err: Error) => {
    console.error('[scrumlord] pg-boss error:', err);
  });

  await boss.start();

  // Register scheduled jobs (idempotent — safe to call every restart).
  await boss.schedule(QUEUE_OUTBOX_DISPATCH, '* * * * *', {});
  await boss.schedule(QUEUE_SPRINT_AUTOCLOSE, '*/5 * * * *', {});
  await boss.schedule(QUEUE_VELOCITY_SNAPSHOT, '*/5 * * * *', {});
  await boss.schedule(QUEUE_TIMER_REAP, '*/10 * * * *', {});

  // Wire up job handlers.
  await boss.work(QUEUE_OUTBOX_DISPATCH, async () => {
    const count = await runOutboxDispatch();
    if (count > 0) console.log(`[scrumlord] outbox-dispatch processed ${count} event(s)`);
  });

  await boss.work(QUEUE_SPRINT_AUTOCLOSE, async () => {
    const count = await runSprintAutoclose();
    if (count > 0) console.log(`[scrumlord] sprint-autoclose closed ${count} sprint(s)`);
  });

  await boss.work(QUEUE_VELOCITY_SNAPSHOT, async () => {
    const count = await runVelocitySnapshot();
    if (count > 0) console.log(`[scrumlord] velocity-snapshot updated ${count} sprint(s)`);
  });

  await boss.work(QUEUE_TIMER_REAP, async () => {
    const count = await runTimerReap();
    if (count > 0) console.log(`[scrumlord] timer-reap reaped ${count} timer(s)`);
  });

  console.log('🌀 scrumlord awakened — the dailies have a master');

  // Graceful shutdown on SIGINT / SIGTERM.
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[scrumlord] received ${signal}, stopping…`);
    await boss.stop();
    console.log('[scrumlord] pg-boss stopped — farewell, dark lord');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  console.error('[scrumlord] fatal startup error:', err);
  process.exit(1);
});
