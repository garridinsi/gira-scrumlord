// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('time tracking', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
  });

  async function setupIssue() {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    await app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload: { projectKey, title: 'Work' } });
    return { user, cookie };
  }

  it('logs and lists worklogs', async () => {
    const { cookie } = await setupIssue();
    const add = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/worklogs',
      headers: { cookie },
      payload: { minutes: 90, note: 'deep work', billable: true },
    });
    expect(add.statusCode).toBe(201);
    expect(add.json().minutes).toBe(90);

    const list = await app.inject({ method: 'GET', url: '/issues/GIRA-1/worklogs', headers: { cookie } });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].note).toBe('deep work');
  });

  it('allows only one active timer per user', async () => {
    const { cookie } = await setupIssue();
    const first = await app.inject({ method: 'POST', url: '/timers/start', headers: { cookie }, payload: { issueKey: 'GIRA-1' } });
    expect(first.statusCode).toBe(201);
    const second = await app.inject({ method: 'POST', url: '/timers/start', headers: { cookie }, payload: { issueKey: 'GIRA-1' } });
    expect(second.statusCode).toBe(409);
  });

  it('stopping a timer writes a worklog with elapsed minutes and clears the timer', async () => {
    const { user, cookie } = await setupIssue();
    await app.inject({ method: 'POST', url: '/timers/start', headers: { cookie }, payload: { issueKey: 'GIRA-1' } });
    // Backdate the timer 90 minutes so elapsed time is deterministic.
    await prisma.timer.update({
      where: { userId: user.id },
      data: { startedAt: new Date(Date.now() - 90 * 60_000) },
    });

    const stop = await app.inject({ method: 'POST', url: '/timers/stop', headers: { cookie } });
    expect(stop.statusCode).toBe(200);
    expect(stop.json().minutes).toBeGreaterThanOrEqual(89);
    expect(stop.json().minutes).toBeLessThanOrEqual(91);

    const active = await app.inject({ method: 'GET', url: '/timers/active', headers: { cookie } });
    expect(active.json()).toBeNull();
  });

  it('stop without a running timer is 404', async () => {
    const { cookie } = await setupIssue();
    const stop = await app.inject({ method: 'POST', url: '/timers/stop', headers: { cookie } });
    expect(stop.statusCode).toBe(404);
  });
});
