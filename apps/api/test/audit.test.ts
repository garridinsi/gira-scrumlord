// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';

describe('audit log (admin read-only view)', () => {
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

  it('admin lists entries (with actor) but a member is forbidden', async () => {
    const admin = await actingAs({ role: 'admin' });
    // A real admin action that records an audit row (sprint.create writes one in-tx).
    await app.inject({ method: 'POST', url: '/projects', headers: { cookie: admin.cookie }, payload: { key: 'AUD', name: 'Audited' } });
    await app.inject({ method: 'POST', url: '/projects/AUD/sprints', headers: { cookie: admin.cookie }, payload: { name: 'S1' } });

    const res = await app.inject({ method: 'GET', url: '/audit', headers: { cookie: admin.cookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.count).toBeGreaterThan(0);
    expect(body.entries.some((e: { action: string }) => e.action === 'sprint.create')).toBe(true);
    expect(body.entries[0].actor).toBeTruthy(); // actor is joined in

    const member = await actingAs({ role: 'member' });
    const denied = await app.inject({ method: 'GET', url: '/audit', headers: { cookie: member.cookie } });
    expect(denied.statusCode).toBe(403); // admin-only
  });

  it('filters by entityType / entityId / action and clamps the limit', async () => {
    const admin = await actingAs({ role: 'admin' });
    await prisma.auditLog.createMany({
      data: [
        { actorId: admin.user.id, action: 'client.create', entityType: 'Client', entityId: 'c1', after: {} },
        { actorId: admin.user.id, action: 'issue.update', entityType: 'Issue', entityId: 'i1', after: {} },
        { actorId: admin.user.id, action: 'issue.delete', entityType: 'Issue', entityId: 'i1', before: {} },
      ],
    });

    const byType = await app.inject({ method: 'GET', url: '/audit?entityType=Issue', headers: { cookie: admin.cookie } });
    expect(byType.json().entries.every((e: { entityType: string }) => e.entityType === 'Issue')).toBe(true);
    expect(byType.json().count).toBe(2);

    const byEntityAndAction = await app.inject({
      method: 'GET',
      url: '/audit?entityId=i1&action=issue.delete',
      headers: { cookie: admin.cookie },
    });
    expect(byEntityAndAction.json().count).toBe(1);

    // limit is clamped into [1, 200] — 0 and an over-large value both succeed.
    expect((await app.inject({ method: 'GET', url: '/audit?limit=0', headers: { cookie: admin.cookie } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/audit?limit=9999', headers: { cookie: admin.cookie } })).statusCode).toBe(200);
  });
});
