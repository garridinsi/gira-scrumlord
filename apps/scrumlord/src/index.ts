// SPDX-License-Identifier: GPL-3.0-or-later
// scrumlord — the daemon that governs the dailies.
// One ticket to rule them all. Sauron watches. The tornado is you at end of quarter.

import { escalateOpenIncidents } from '@gira/notify';
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
const QUEUE_INCIDENT_ESCALATE = 'incident-escalate';

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

  // pg-boss v10 enforces a foreign key from schedule.name -> queue.name, so each
  // queue must exist before we schedule or work it. createQueue is idempotent.
  const jobs: Array<{ queue: string; cron: string; run: () => Promise<void> }> = [
    {
      queue: QUEUE_OUTBOX_DISPATCH,
      cron: '* * * * *',
      run: async () => {
        const count = await runOutboxDispatch();
        if (count > 0) console.log(`[scrumlord] outbox-dispatch processed ${count} event(s)`);
      },
    },
    {
      queue: QUEUE_SPRINT_AUTOCLOSE,
      cron: '*/5 * * * *',
      run: async () => {
        const count = await runSprintAutoclose();
        if (count > 0) console.log(`[scrumlord] sprint-autoclose closed ${count} sprint(s)`);
      },
    },
    {
      queue: QUEUE_VELOCITY_SNAPSHOT,
      cron: '*/5 * * * *',
      run: async () => {
        const count = await runVelocitySnapshot();
        if (count > 0) console.log(`[scrumlord] velocity-snapshot updated ${count} sprint(s)`);
      },
    },
    {
      queue: QUEUE_TIMER_REAP,
      cron: '*/10 * * * *',
      run: async () => {
        const count = await runTimerReap();
        if (count > 0) console.log(`[scrumlord] timer-reap reaped ${count} timer(s)`);
      },
    },
    {
      queue: QUEUE_INCIDENT_ESCALATE,
      cron: '*/2 * * * *',
      run: async () => {
        const count = await escalateOpenIncidents({ intervalMinutes: 5, maxLevel: 3 });
        if (count > 0) console.log(`[scrumlord] incident-escalate re-paged ${count} incident(s)`);
      },
    },
  ];

  for (const job of jobs) {
    await boss.createQueue(job.queue);
    await boss.work(job.queue, () => job.run());
    await boss.schedule(job.queue, job.cron, {});
  }

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
