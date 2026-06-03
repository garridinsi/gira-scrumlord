// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';

describe('clients + projects + isolation', () => {
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

  it('admin creates a client; non-admin is forbidden', async () => {
    const { cookie: adminCookie } = await actingAs({ role: 'admin' });
    const ok = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: { cookie: adminCookie },
      payload: { name: 'Acme Corp', slug: 'acme', currency: 'EUR' },
    });
    expect(ok.statusCode).toBe(201);

    const { cookie: memberCookie } = await actingAs({ role: 'member' });
    const denied = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: { cookie: memberCookie },
      payload: { name: 'Beta', slug: 'beta' },
    });
    expect(denied.statusCode).toBe(403);
  });

  it('creating a project seeds the five default statuses', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie },
      payload: { key: 'GIRA', name: 'gira-scrumlord' },
    });
    expect(res.statusCode).toBe(201);

    const statuses = await app.inject({
      method: 'GET',
      url: '/projects/GIRA/statuses',
      headers: { cookie },
    });
    const names = statuses.json().map((s: { name: string }) => s.name);
    expect(names).toEqual(['Backlog', 'To Do', 'In Progress', 'In Review', 'Done']);
  });

  it('rejects a duplicate project key with 409', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const payload = { key: 'DUP', name: 'one' };
    await app.inject({ method: 'POST', url: '/projects', headers: { cookie }, payload });
    const again = await app.inject({ method: 'POST', url: '/projects', headers: { cookie }, payload });
    expect(again.statusCode).toBe(409);
  });

  it('isolates clients: client A cannot read client B’s project', async () => {
    const clientA = await prisma.client.create({ data: { name: 'A', slug: 'a' } });
    const clientB = await prisma.client.create({ data: { name: 'B', slug: 'b' } });
    const staff = await actingAs({ role: 'member' });
    // staff creates a project for each client
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie: staff.cookie },
      payload: { key: 'AAA', name: 'A project', clientId: clientA.id },
    });
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie: staff.cookie },
      payload: { key: 'BBB', name: 'B project', clientId: clientB.id },
    });

    const userA = await actingAs({ kind: 'client', role: 'viewer', clientId: clientA.id });

    // A sees only its own project in the list
    const list = await app.inject({ method: 'GET', url: '/projects', headers: { cookie: userA.cookie } });
    expect(list.json().map((p: { key: string }) => p.key)).toEqual(['AAA']);

    // A is forbidden from reading B's project directly
    const cross = await app.inject({ method: 'GET', url: '/projects/BBB', headers: { cookie: userA.cookie } });
    expect(cross.statusCode).toBe(403);

    // A can read its own
    const own = await app.inject({ method: 'GET', url: '/projects/AAA', headers: { cookie: userA.cookie } });
    expect(own.statusCode).toBe(200);
  });

  it('blocks switching to monthly cadence while a sprint is active; allows it otherwise', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie },
      payload: { key: 'CAD', name: 'Cadence', cadence: 'sprints' },
    });
    // A future sprint exists, then is started (active).
    const sprint = await app.inject({
      method: 'POST',
      url: '/projects/CAD/sprints',
      headers: { cookie },
      payload: { name: 'S1' },
    });
    await app.inject({
      method: 'POST',
      url: `/sprints/${sprint.json().id}/start`,
      headers: { cookie },
    });

    // Switching to monthly is blocked while the sprint is live.
    const blocked = await app.inject({
      method: 'PATCH',
      url: '/projects/CAD',
      headers: { cookie },
      payload: { cadence: 'monthly' },
    });
    expect(blocked.statusCode).toBe(409);

    // Close the sprint, then the switch succeeds.
    await app.inject({ method: 'POST', url: `/sprints/${sprint.json().id}/close`, headers: { cookie } });
    const ok = await app.inject({
      method: 'PATCH',
      url: '/projects/CAD',
      headers: { cookie },
      payload: { cadence: 'monthly' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().cadence).toBe('monthly');
  });

  it('refuses to delete a client that still has users (FK RESTRICT, clean 409)', async () => {
    const admin = await actingAs({ role: 'admin' });
    const client = await prisma.client.create({ data: { name: 'Has Users', slug: 'hasusers' } });
    const portalUser = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });

    const blocked = await app.inject({
      method: 'DELETE',
      url: `/clients/${client.id}`,
      headers: { cookie: admin.cookie },
    });
    expect(blocked.statusCode).toBe(409); // clean message, not a raw FK 500

    // Remove the user, then the client deletes cleanly.
    await prisma.session.deleteMany({ where: { userId: portalUser.user.id } });
    await prisma.user.delete({ where: { id: portalUser.user.id } });
    const ok = await app.inject({
      method: 'DELETE',
      url: `/clients/${client.id}`,
      headers: { cookie: admin.cookie },
    });
    expect(ok.statusCode).toBe(204);
  });

  it('refuses to delete a client that still has projects (FK RESTRICT, clean 409)', async () => {
    const admin = await actingAs({ role: 'admin' });
    const client = await prisma.client.create({ data: { name: 'Has Projects', slug: 'hasprojects' } });
    await prisma.project.create({ data: { key: 'OWNED', name: 'Owned', clientId: client.id } });

    const blocked = await app.inject({
      method: 'DELETE',
      url: `/clients/${client.id}`,
      headers: { cookie: admin.cookie },
    });
    // A raw FK SET NULL would have silently orphaned OWNED out of tenant scope; instead
    // RESTRICT + the pre-check refuse with a clean message.
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error).toMatch(/project/);
    // The project must still be attached (not nulled out).
    expect((await prisma.project.findUnique({ where: { key: 'OWNED' } }))?.clientId).toBe(client.id);
  });

  it('refuses to delete a client that still has billing annexes (financial records kept)', async () => {
    const admin = await actingAs({ role: 'admin' });
    const client = await prisma.client.create({ data: { name: 'Has Annex', slug: 'hasannex', currency: 'EUR' } });
    // A bare invoice row is enough to assert the Invoice→Client RESTRICT guard.
    await prisma.invoice.create({
      data: { number: 'ANX-2099-0001', clientId: client.id, status: 'issued', currency: 'EUR' },
    });

    const blocked = await app.inject({
      method: 'DELETE',
      url: `/clients/${client.id}`,
      headers: { cookie: admin.cookie },
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error).toMatch(/annex|financial/);
    // The annex must survive (Cascade would have destroyed it).
    expect(await prisma.invoice.count({ where: { clientId: client.id } })).toBe(1);
  });

  it('reads + patches a project, lists labels, and patches a status', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    await app.inject({ method: 'POST', url: '/projects', headers: { cookie }, payload: { key: 'PCH', name: 'Patchable' } });

    const one = await app.inject({ method: 'GET', url: '/projects/PCH', headers: { cookie } });
    expect(one.statusCode).toBe(200);
    expect(one.json().key).toBe('PCH');

    const patched = await app.inject({ method: 'PATCH', url: '/projects/PCH', headers: { cookie }, payload: { name: 'Renamed' } });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().name).toBe('Renamed');

    await app.inject({ method: 'POST', url: '/projects/PCH/labels', headers: { cookie }, payload: { name: 'bug' } });
    const labels = await app.inject({ method: 'GET', url: '/projects/PCH/labels', headers: { cookie } });
    expect(labels.json().map((l: { name: string }) => l.name)).toContain('bug');

    const st = (
      await app.inject({ method: 'POST', url: '/projects/PCH/statuses', headers: { cookie }, payload: { name: 'QA', category: 'in_progress' } })
    ).json();
    const stp = await app.inject({ method: 'PATCH', url: `/statuses/${st.id}`, headers: { cookie }, payload: { name: 'QA Review' } });
    expect(stp.statusCode).toBe(200);
    expect(stp.json().name).toBe('QA Review');
  });

  it('records an audit entry when deleting a status or label (parity with create)', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    await app.inject({ method: 'POST', url: '/projects', headers: { cookie }, payload: { key: 'AUD', name: 'Audited' } });
    const label = (await app.inject({ method: 'POST', url: '/projects/AUD/labels', headers: { cookie }, payload: { name: 'temp' } })).json();
    const extraStatus = (
      await app.inject({ method: 'POST', url: '/projects/AUD/statuses', headers: { cookie }, payload: { name: 'Extra', category: 'todo' } })
    ).json();

    expect((await app.inject({ method: 'DELETE', url: `/labels/${label.id}`, headers: { cookie } })).statusCode).toBe(204);
    expect((await app.inject({ method: 'DELETE', url: `/statuses/${extraStatus.id}`, headers: { cookie } })).statusCode).toBe(204);

    const actions = (await prisma.auditLog.findMany({ where: { actorId: user.id } })).map((a) => a.action);
    expect(actions).toContain('label.delete');
    expect(actions).toContain('status.delete');

    // Deleting a non-existent record is a clean 404, not an unaudited no-op.
    expect((await app.inject({ method: 'DELETE', url: '/labels/cl00000000000000000000000', headers: { cookie } })).statusCode).toBe(404);
  });

  it('refuses to delete a status that still has issues (FK → in_use 409)', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    await app.inject({ method: 'POST', url: '/projects', headers: { cookie }, payload: { key: 'FKP', name: 'FK Project' } });
    const statuses = (await app.inject({ method: 'GET', url: '/projects/FKP/statuses', headers: { cookie } })).json();
    const backlog = statuses.find((s: { name: string }) => s.name === 'Backlog');
    await app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload: { projectKey: 'FKP', title: 'lives in Backlog' } });

    const del = await app.inject({ method: 'DELETE', url: `/statuses/${backlog.id}`, headers: { cookie } });
    expect(del.statusCode).toBe(409); // raw FK P2003 → clean in_use, not a 500
  });

  it('client (viewer) cannot create a project', async () => {
    const client = await prisma.client.create({ data: { name: 'C', slug: 'c' } });
    const { cookie } = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie },
      payload: { key: 'NOPE', name: 'nope' },
    });
    expect(res.statusCode).toBe(403);
  });
});
