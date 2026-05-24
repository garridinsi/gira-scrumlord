// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('client portal (M2)', () => {
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
    const client = await prisma.client.create({
      data: { name: 'Acme Corp', slug: 'acme', currency: 'EUR' },
    });
    const staff = await actingAs({ role: 'member' });
    const { projectKey, byName } = await seedProject({
      reporterId: staff.user.id,
      key: 'ACME',
      clientId: client.id,
    });
    return { client, staff, projectKey, byName };
  }

  const create = (cookie: string, payload: object) =>
    app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload });
  const patch = (cookie: string, key: string, payload: object) =>
    app.inject({ method: 'PATCH', url: `/issues/${key}`, headers: { cookie }, payload });

  it('overview aggregates the client’s projects by status + time + money', async () => {
    const { client, staff, byName } = await setup();
    // ACME-1 stays in Backlog (open), ACME-2 -> In Progress, ACME-3 -> Done
    await create(staff.cookie, { projectKey: 'ACME', title: 'Open one' });
    await create(staff.cookie, { projectKey: 'ACME', title: 'Working' });
    await create(staff.cookie, { projectKey: 'ACME', title: 'Finished' });
    await patch(staff.cookie, 'ACME-2', { statusId: byName['In Progress']!.id });
    await patch(staff.cookie, 'ACME-3', { statusId: byName.Done!.id });
    await app.inject({
      method: 'POST',
      url: '/issues/ACME-1/worklogs',
      headers: { cookie: staff.cookie },
      payload: { minutes: 120, billable: true },
    });
    await app.inject({
      method: 'POST',
      url: '/rates',
      headers: { cookie: staff.cookie },
      payload: { scope: 'default', hourlyCents: 6000 },
    });

    const viewer = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    const res = await app.inject({ method: 'GET', url: '/portal', headers: { cookie: viewer.cookie } });
    expect(res.statusCode).toBe(200);
    const ov = res.json();
    expect(ov.client.name).toBe('Acme Corp');
    expect(ov.projects.map((p: { key: string }) => p.key)).toEqual(['ACME']);
    expect(ov.totals).toMatchObject({ open: 1, inProgress: 1, done: 1, totalMinutes: 120, billableMinutes: 120 });
    expect(ov.totals.accruedCents).toBe(12000); // 120min @ 6000/h
  });

  it('lets a client file a request into their own project (capped priority)', async () => {
    const { client } = await setup();
    const viewer = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    const res = await app.inject({
      method: 'POST',
      url: '/portal/requests',
      headers: { cookie: viewer.cookie },
      payload: { projectKey: 'ACME', title: 'Anvil delivery is late', type: 'bug' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().priority).toBe('medium');
    const issue = await prisma.issue.findFirst({ where: { title: 'Anvil delivery is late' } });
    expect(issue?.reporterId).toBe(viewer.user.id);
  });

  it('is client-only and client-scoped', async () => {
    const { client, staff } = await setup();
    // staff can't use the portal
    const staffRes = await app.inject({ method: 'GET', url: '/portal', headers: { cookie: staff.cookie } });
    expect(staffRes.statusCode).toBe(403);

    // a client can't file into another client's project
    const other = await prisma.client.create({ data: { name: 'Beta', slug: 'beta' } });
    await seedProject({ reporterId: staff.user.id, key: 'BETA', clientId: other.id });
    const viewer = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    const res = await app.inject({
      method: 'POST',
      url: '/portal/requests',
      headers: { cookie: viewer.cookie },
      payload: { projectKey: 'BETA', title: 'sneaky' },
    });
    expect(res.statusCode).toBe(403);
  });
});
