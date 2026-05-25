// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('invoicing (M5)', () => {
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
    await seedProject({ reporterId: staff.user.id, key: 'ACME', clientId: client.id });
    return { client, staff };
  }

  const create = (cookie: string, payload: object) =>
    app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload });
  const logWork = (cookie: string, key: string, minutes: number, billable = true) =>
    app.inject({
      method: 'POST',
      url: `/issues/${key}/worklogs`,
      headers: { cookie },
      payload: { minutes, billable },
    });
  const setRate = (cookie: string, hourlyCents: number) =>
    app.inject({
      method: 'POST',
      url: '/rates',
      headers: { cookie },
      payload: { scope: 'default', hourlyCents },
    });
  const generate = (cookie: string, clientId: string, payload: object = {}) =>
    app.inject({
      method: 'POST',
      url: `/clients/${clientId}/invoices`,
      headers: { cookie },
      payload,
    });

  it('generates a draft that freezes the resolved rate into each line', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Build the anvil' });
    await logWork(staff.cookie, 'ACME-1', 120); // 2h
    await setRate(staff.cookie, 6000); // €60/h

    const gen = await generate(staff.cookie, client.id);
    expect(gen.statusCode).toBe(201);
    const inv = gen.json();
    expect(inv.status).toBe('draft');
    expect(inv.currency).toBe('EUR');
    expect(inv.number).toMatch(/^INV-\d{4}-0001$/);
    expect(inv.lines).toHaveLength(1);
    expect(inv.lines[0]).toMatchObject({ issueKey: 'ACME-1', minutes: 120, hourlyCents: 6000, amountCents: 12000 });
    expect(inv.subtotalCents).toBe(12000);

    // Change the rate AFTER invoicing — the invoice must not move.
    await setRate(staff.cookie, 99999);
    const reread = await app.inject({
      method: 'GET',
      url: `/invoices/${inv.id}`,
      headers: { cookie: staff.cookie },
    });
    expect(reread.json().lines[0]).toMatchObject({ hourlyCents: 6000, amountCents: 12000 });
  });

  it('refuses to generate when an hourly issue has no rate (no silent €0)', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Unrated work' });
    await logWork(staff.cookie, 'ACME-1', 120);
    // No rate configured at any scope.
    const gen = await generate(staff.cookie, client.id);
    expect(gen.statusCode).toBe(400);
    expect(gen.json().error ?? gen.json().message).toMatch(/rate/i);
    // And nothing was created.
    expect((await app.inject({ method: 'GET', url: `/clients/${client.id}/invoices`, headers: { cookie: staff.cookie } })).json()).toEqual([]);
  });

  it('never bills the same hours twice', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 60);
    await setRate(staff.cookie, 6000);

    expect((await generate(staff.cookie, client.id)).statusCode).toBe(201);
    // Worklog is now claimed — a second run finds nothing billable.
    const second = await generate(staff.cookie, client.id);
    expect(second.statusCode).toBe(400);
  });

  it('walks draft -> issued -> paid and rejects illegal transitions', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 60);
    await setRate(staff.cookie, 6000);
    const id = (await generate(staff.cookie, client.id)).json().id as string;

    const post = (path: string) =>
      app.inject({ method: 'POST', url: `/invoices/${id}/${path}`, headers: { cookie: staff.cookie } });

    expect((await post('pay')).statusCode).toBe(400); // can't pay a draft
    expect((await post('issue')).json().status).toBe('issued');
    expect((await post('issue')).statusCode).toBe(400); // can't re-issue
    expect((await post('pay')).json().status).toBe('paid');
    expect((await post('pay')).statusCode).toBe(400); // can't re-pay
  });

  it('bills a fixed-price issue once, by its price not its hours', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Fixed scope' });
    await prisma.issue.update({
      where: { key: 'ACME-1' },
      data: { billingMode: 'fixed', fixedPriceCents: 50_000 },
    });
    await logWork(staff.cookie, 'ACME-1', 600); // 10h logged, irrelevant to price
    await setRate(staff.cookie, 6000);

    const inv = (await generate(staff.cookie, client.id)).json();
    expect(inv.lines).toHaveLength(1);
    expect(inv.lines[0]).toMatchObject({ hourlyCents: null, amountCents: 50_000, minutes: 600 });
    expect(inv.subtotalCents).toBe(50_000);
  });

  it('void releases the worklogs so they can be billed again', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 90);
    await setRate(staff.cookie, 6000);
    const id = (await generate(staff.cookie, client.id)).json().id as string;

    const voided = await app.inject({
      method: 'POST',
      url: `/invoices/${id}/void`,
      headers: { cookie: staff.cookie },
    });
    expect(voided.json().status).toBe('void');
    // Freed worklog can be re-invoiced.
    expect((await generate(staff.cookie, client.id)).statusCode).toBe(201);
  });

  it('is staff-only to manage, and clients see only their own issued invoices', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 60);
    await setRate(staff.cookie, 6000);
    const id = (await generate(staff.cookie, client.id)).json().id as string;

    const clientUser = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });

    // A client can't reach the staff billing surface.
    expect(
      (await app.inject({ method: 'GET', url: `/clients/${client.id}/invoices`, headers: { cookie: clientUser.cookie } })).statusCode,
    ).toBe(403);

    // A draft is invisible in the portal…
    expect((await app.inject({ method: 'GET', url: '/portal/invoices', headers: { cookie: clientUser.cookie } })).json()).toEqual([]);
    // …and a client can't fetch a draft by id (404, never confirm it exists).
    expect(
      (await app.inject({ method: 'GET', url: `/portal/invoices/${id}`, headers: { cookie: clientUser.cookie } })).statusCode,
    ).toBe(404);

    // Once issued, it appears in the portal.
    await app.inject({ method: 'POST', url: `/invoices/${id}/issue`, headers: { cookie: staff.cookie } });
    const portal = await app.inject({ method: 'GET', url: '/portal/invoices', headers: { cookie: clientUser.cookie } });
    expect(portal.json()).toHaveLength(1);
    expect(portal.json()[0].id).toBe(id);
  });

  it('a viewer can read invoices but not generate them', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 60);
    await setRate(staff.cookie, 6000);

    const viewer = await actingAs({ role: 'viewer' });
    expect((await generate(viewer.cookie, client.id)).statusCode).toBe(403);
    expect(
      (await app.inject({ method: 'GET', url: `/clients/${client.id}/invoices`, headers: { cookie: viewer.cookie } })).statusCode,
    ).toBe(200);
  });
});
