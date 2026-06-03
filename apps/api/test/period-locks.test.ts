// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('period locks (P1)', () => {
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

  async function setup() {
    const admin = await actingAs({ role: 'admin' });
    const client = await prisma.client.create({
      data: { name: 'Acme', slug: 'acme', currency: 'EUR' },
    });
    const { projectKey } = await seedProject({
      reporterId: admin.user.id,
      key: 'ACME',
      clientId: client.id,
    });
    await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { cookie: admin.cookie },
      payload: { projectKey, title: 'Work' },
    });
    return { admin, client };
  }

  const logAt = (cookie: string, loggedAt: string) =>
    app.inject({
      method: 'POST',
      url: '/issues/ACME-1/worklogs',
      headers: { cookie },
      payload: { minutes: 60, billable: true, loggedAt },
    });
  const lock = (cookie: string, clientId: string, monthKey: string) =>
    app.inject({
      method: 'POST',
      url: `/clients/${clientId}/period-locks`,
      headers: { cookie },
      payload: { monthKey },
    });

  it('locks a month: blocks logging/editing/deleting time in it; other months and post-unlock are fine', async () => {
    const { admin, client } = await setup();
    // March is open → logging works; capture the worklog.
    const w = await logAt(admin.cookie, '2026-03-15T12:00:00.000Z');
    expect(w.statusCode).toBe(201);
    const wlId = w.json().id as string;

    // Lock March.
    const l = await lock(admin.cookie, client.id, '2026-03');
    expect(l.statusCode).toBe(201);

    // No new March time, and the existing March worklog can't be edited or deleted.
    const blocked = await logAt(admin.cookie, '2026-03-20T12:00:00.000Z');
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error).toMatch(/locked/i);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/worklogs/${wlId}`,
          headers: { cookie: admin.cookie },
          payload: { minutes: 30 },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/worklogs/${wlId}`,
          headers: { cookie: admin.cookie },
        })
      ).statusCode,
    ).toBe(409);

    // A different (open) month is unaffected.
    expect((await logAt(admin.cookie, '2026-04-10T12:00:00.000Z')).statusCode).toBe(201);

    // Unlocking March re-opens it.
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/period-locks/${l.json().id}`,
          headers: { cookie: admin.cookie },
        })
      ).statusCode,
    ).toBe(204);
    expect((await logAt(admin.cookie, '2026-03-25T12:00:00.000Z')).statusCode).toBe(201);
  });

  it('refuses moving a worklog INTO a locked month', async () => {
    const { admin, client } = await setup();
    const w = await logAt(admin.cookie, '2026-07-10T12:00:00.000Z'); // open month
    await lock(admin.cookie, client.id, '2026-06'); // lock a different month
    const moved = await app.inject({
      method: 'PATCH',
      url: `/worklogs/${w.json().id}`,
      headers: { cookie: admin.cookie },
      payload: { loggedAt: '2026-06-15T12:00:00.000Z' },
    });
    expect(moved.statusCode).toBe(409);
  });

  it('lists locks; rejects a duplicate (409) and a malformed monthKey (400); is admin-only', async () => {
    const { admin, client } = await setup();
    expect((await lock(admin.cookie, client.id, '2026-05')).statusCode).toBe(201);
    expect((await lock(admin.cookie, client.id, '2026-05')).statusCode).toBe(409); // duplicate
    expect((await lock(admin.cookie, client.id, '2026-13')).statusCode).toBe(400); // month 13
    expect((await lock(admin.cookie, client.id, 'nope')).statusCode).toBe(400);

    const list = await app.inject({
      method: 'GET',
      url: `/clients/${client.id}/period-locks`,
      headers: { cookie: admin.cookie },
    });
    expect(list.json().map((x: { monthKey: string }) => x.monthKey)).toContain('2026-05');

    const member = await actingAs({ role: 'member' });
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/clients/${client.id}/period-locks`,
          headers: { cookie: member.cookie },
        })
      ).statusCode,
    ).toBe(403);
  });

  it('404s locking a non-existent client and deleting a missing lock', async () => {
    const { admin } = await setup();
    expect((await lock(admin.cookie, 'clnonexistent000000000000', '2026-06')).statusCode).toBe(404);
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: '/period-locks/nope',
          headers: { cookie: admin.cookie },
        })
      ).statusCode,
    ).toBe(404);
  });
});
