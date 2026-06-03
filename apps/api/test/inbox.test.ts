// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';

describe('in-app inbox (E1)', () => {
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

  const personal = (userId: string, type = 'issue.assigned') =>
    prisma.notification.create({
      data: { type, userId, payload: { issueKey: 'X-1' }, status: 'sent' },
    });

  it('shows the caller their own notifications, counts/marks unread, and scopes to the caller', async () => {
    const me = await actingAs({ role: 'member' });
    const other = await actingAs({ role: 'member' });

    await personal(me.user.id);
    const n2 = await personal(me.user.id, 'issue.status_changed');
    await personal(other.user.id); // belongs to someone else
    // A channel notification (no userId) must never surface in anyone's inbox.
    await prisma.notification.create({
      data: { type: 'issue.emergency', payload: {}, status: 'sent' },
    });

    const inbox = (
      await app.inject({ method: 'GET', url: '/inbox', headers: { cookie: me.cookie } })
    ).json();
    expect(inbox).toHaveLength(2);

    const count = () =>
      app
        .inject({ method: 'GET', url: '/inbox/unread-count', headers: { cookie: me.cookie } })
        .then((r) => r.json().unread);
    expect(await count()).toBe(2);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/inbox?unread=true',
          headers: { cookie: me.cookie },
        })
      ).json(),
    ).toHaveLength(2);

    // Mark one read → unread drops.
    const read = await app.inject({
      method: 'POST',
      url: `/inbox/${n2.id}/read`,
      headers: { cookie: me.cookie },
    });
    expect(read.statusCode).toBe(200);
    expect(read.json().readAt).not.toBeNull();
    expect(await count()).toBe(1);

    // Cannot touch another user's notification (404, never reveals it exists).
    const theirs = await personal(other.user.id);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/inbox/${theirs.id}/read`,
          headers: { cookie: me.cookie },
        })
      ).statusCode,
    ).toBe(404);

    // Read-all clears the rest (only the caller's).
    expect(
      (
        await app.inject({ method: 'POST', url: '/inbox/read-all', headers: { cookie: me.cookie } })
      ).json().marked,
    ).toBe(1);
    expect(await count()).toBe(0);
    // The other user is unaffected.
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/inbox/unread-count',
          headers: { cookie: other.cookie },
        })
      ).json().unread,
    ).toBe(2);
  });

  it('marking an already-read notification is idempotent', async () => {
    const me = await actingAs({ role: 'member' });
    const n = await personal(me.user.id);
    const first = await app.inject({
      method: 'POST',
      url: `/inbox/${n.id}/read`,
      headers: { cookie: me.cookie },
    });
    const firstReadAt = first.json().readAt;
    const second = await app.inject({
      method: 'POST',
      url: `/inbox/${n.id}/read`,
      headers: { cookie: me.cookie },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().readAt).toBe(firstReadAt); // unchanged
  });
});
