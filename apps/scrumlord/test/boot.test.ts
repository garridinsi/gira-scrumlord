// SPDX-License-Identifier: GPL-3.0-or-later
// Regression test for the pg-boss boot path. Without createQueue() before
// schedule(), pg-boss v10 throws FK 23503 (schedule.name -> queue.name) and the
// daemon crash-loops. This exercises the real registerJobs() sequence.
import PgBoss from 'pg-boss';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JOBS, registerJobs } from '../src/index.js';

describe('scrumlord boot path', () => {
  let boss: PgBoss;

  beforeAll(async () => {
    boss = new PgBoss(process.env.DATABASE_URL!);
    await boss.start();
  });

  afterAll(async () => {
    await boss?.stop({ graceful: false });
  });

  it('creates and schedules every queue without a FK error', async () => {
    // Would throw "23503 ... not present in table queue" without createQueue().
    await expect(registerJobs(boss)).resolves.not.toThrow();

    const schedules = await boss.getSchedules();
    const scheduled = new Set(schedules.map((s) => s.name));
    for (const job of JOBS) {
      expect(scheduled.has(job.queue)).toBe(true);
    }
    expect(JOBS.length).toBe(5);
  });
});
