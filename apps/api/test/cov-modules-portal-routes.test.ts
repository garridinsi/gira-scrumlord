// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage gaps for src/modules/portal/routes.ts:
//   L35 — POST /portal/requests into a non-existent project (the `!project` arm).
//   L69 — GET /portal/invoices/:id for an annex that isn't client-visible (404).
//   L70 — GET /portal/invoices/:id happy path: an issued annex returns its view.
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('cov src/modules/portal/routes.ts', () => {
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

  // Mirror invoices.test.ts setup: a client + an admin staffer who seeds the project,
  // and a full draft annex generated from one billable worklog at a default rate.
  async function setup() {
    const client = await prisma.client.create({
      data: { name: 'Acme Corp', slug: 'acme', currency: 'EUR' },
    });
    const staff = await actingAs({ role: 'admin' });
    await seedProject({ reporterId: staff.user.id, key: 'ACME', clientId: client.id });
    return { client, staff };
  }

  const create = (cookie: string, payload: object) =>
    app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload });
  const logWork = (cookie: string, key: string, minutes: number) =>
    app.inject({
      method: 'POST',
      url: `/issues/${key}/worklogs`,
      headers: { cookie },
      payload: { minutes, billable: true },
    });
  const setRate = (cookie: string, hourlyCents: number) =>
    app.inject({
      method: 'POST',
      url: '/rates',
      headers: { cookie },
      payload: { scope: 'default', hourlyCents },
    });
  const generate = (cookie: string, clientId: string) =>
    app.inject({ method: 'POST', url: `/clients/${clientId}/invoices`, headers: { cookie } });

  // L35: a well-formed key that maps to no project → the prisma lookup returns null.
  it('404s when a client files a request into a project that does not exist', async () => {
    const { client } = await setup();
    const viewer = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    const res = await app.inject({
      method: 'POST',
      url: '/portal/requests',
      headers: { cookie: viewer.cookie },
      // 'NOPE' passes the key regex but matches no row → `!project` branch.
      payload: { projectKey: 'NOPE', title: 'into the void', type: 'bug' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error ?? res.json().message).toMatch(/project not found/i);
  });

  // L69: a draft annex is not client-visible → 404 (never confirm it exists).
  it('404s when a client fetches an annex that is not issued/paid', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 60);
    await setRate(staff.cookie, 6000);
    const id = (await generate(staff.cookie, client.id)).json().id as string;

    const viewer = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    const res = await app.inject({
      method: 'GET',
      url: `/portal/invoices/${id}`,
      headers: { cookie: viewer.cookie },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error ?? res.json().message).toMatch(/invoice not found/i);
  });

  // L70: once issued, the owning client fetches the annex by id → the view is returned.
  it('returns the annex view to its owning client once it is issued', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 120); // 2h
    await setRate(staff.cookie, 6000); // €60/h
    const id = (await generate(staff.cookie, client.id)).json().id as string;
    await app.inject({
      method: 'POST',
      url: `/invoices/${id}/issue`,
      headers: { cookie: staff.cookie },
    });

    const viewer = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    const res = await app.inject({
      method: 'GET',
      url: `/portal/invoices/${id}`,
      headers: { cookie: viewer.cookie },
    });
    expect(res.statusCode).toBe(200);
    const inv = res.json();
    expect(inv.id).toBe(id);
    expect(inv.clientId).toBe(client.id);
    expect(inv.status).toBe('issued');
    expect(inv.subtotalCents).toBe(12000); // 120min @ 6000/h
    expect(inv.lines[0]).toMatchObject({ issueKey: 'ACME-1', minutes: 120, hourlyCents: 6000 });
  });
});
