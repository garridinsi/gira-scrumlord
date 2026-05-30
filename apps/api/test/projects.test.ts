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
