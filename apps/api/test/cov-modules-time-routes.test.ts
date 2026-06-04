// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for src/modules/time/routes.ts. These target lines the main
// time.test.ts does not reach: the `worklog not found` arm of loadEditableWorklog
// (PATCH/DELETE against a non-existent id) and both arms of GET /timers/active (the
// running-timer view as well as the no-timer `null`).
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('cov src/modules/time/routes.ts', () => {
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

  /** Seed a project owned by `user` with one issue created via the API. */
  async function setupIssue() {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { cookie },
      payload: { projectKey, title: 'Work' },
    });
    return { user, cookie };
  }

  // routes.ts:68 — `if (!wl) throw notFound('worklog not found')`. assertCanWrite
  // passes first (member has write), then the lookup returns null for an unknown id.
  it('PATCH /worklogs/:id with an unknown id is 404 (worklog not found)', async () => {
    const { cookie } = await setupIssue();
    const res = await app.inject({
      method: 'PATCH',
      url: '/worklogs/cl00000000000000000000000',
      headers: { cookie },
      payload: { minutes: 5 },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('worklog not found');
  });

  it('DELETE /worklogs/:id with an unknown id is 404 (worklog not found)', async () => {
    const { cookie } = await setupIssue();
    const res = await app.inject({
      method: 'DELETE',
      url: '/worklogs/cl00000000000000000000000',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('worklog not found');
  });

  // routes.ts:143 — `return timer ? toTimerView(timer) : null`. Cover the truthy arm
  // (a timer is running) and the falsy arm (no timer ⇒ null).
  it('GET /timers/active returns the view when a timer is running, null otherwise', async () => {
    const { cookie } = await setupIssue();

    const none = await app.inject({
      method: 'GET',
      url: '/timers/active',
      headers: { cookie },
    });
    expect(none.statusCode).toBe(200);
    expect(none.json()).toBeNull();

    await app.inject({
      method: 'POST',
      url: '/timers/start',
      headers: { cookie },
      payload: { issueKey: 'GIRA-1' },
    });

    const running = await app.inject({
      method: 'GET',
      url: '/timers/active',
      headers: { cookie },
    });
    expect(running.statusCode).toBe(200);
    expect(running.json()).toMatchObject({ issueKey: 'GIRA-1' });
  });
});
