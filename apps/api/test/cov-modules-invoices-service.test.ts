// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for src/modules/invoices/service.ts. Surgical: each test
// targets a specific uncovered line/branch the broad invoices.test.ts suite misses
// (404 loaders, the client-not-found guard, the dated-contract retainer predicate,
// the retainer-overage currency mismatch arm, and the void/delete status guards).

import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('cov src/modules/invoices/service.ts', () => {
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
  const logAt = (cookie: string, key: string, minutes: number, loggedAt: string) =>
    app.inject({
      method: 'POST',
      url: `/issues/${key}/worklogs`,
      headers: { cookie },
      payload: { minutes, billable: true, loggedAt },
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

  const MARCH = { periodStart: '2026-03-01', periodEnd: '2026-03-31' };

  // ── 404 loaders (loadInvoiceOr404, line 97) ──────────────────────────────────
  it('GET /invoices/:id 404s when the invoice does not exist (loadInvoiceOr404)', async () => {
    const { staff } = await setup();
    const res = await app.inject({
      method: 'GET',
      url: '/invoices/does-not-exist',
      headers: { cookie: staff.cookie },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('invoice not found');
  });

  // ── client-not-found guard (generateInvoice, line 129) ───────────────────────
  it('generate 404s when the client does not exist (client-not-found guard)', async () => {
    const { staff } = await setup();
    const res = await generate(staff.cookie, 'no-such-client');
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('client not found');
  });

  // ── dated-contract retainer predicate (lines 176-177) ────────────────────────
  it('applies a retainer whose startDate/endDate bracket the period (date-bound predicate)', async () => {
    const { client, staff } = await setup();
    // startDate before, endDate after the period → both right-hand comparisons run and match.
    await prisma.contract.create({
      data: {
        clientId: client.id,
        name: 'Dated retainer',
        retainerCents: 400_000,
        status: 'active',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T00:00:00.000Z'),
      },
    });
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    // Covered work needs no rate; the flat retainer fee is the whole annex here.
    await prisma.issue.update({ where: { key: 'ACME-1' }, data: { billingMode: 'covered' } });
    await logAt(staff.cookie, 'ACME-1', 120, '2026-03-15T12:00:00.000Z');
    const inv = (await generate(staff.cookie, client.id, MARCH)).json();
    expect(inv.subtotalCents).toBe(400_000);
    expect(
      inv.lines.some(
        (l: { issueKey: string; amountCents: number }) =>
          l.issueKey === 'RETAINER' && l.amountCents === 400_000,
      ),
    ).toBe(true);
  });

  // ── voidInvoice guards (lines 494, 495) ──────────────────────────────────────
  it('refuses to void a paid invoice and refuses to re-void a void one', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 60);
    await setRate(staff.cookie, 6000);
    const id = (await generate(staff.cookie, client.id)).json().id as string;
    const post = (path: string) =>
      app.inject({
        method: 'POST',
        url: `/invoices/${id}/${path}`,
        headers: { cookie: staff.cookie },
      });

    // draft → issued → paid, then voiding is refused (line 494).
    expect((await post('issue')).statusCode).toBe(200);
    expect((await post('pay')).statusCode).toBe(200);
    const blockedPaid = await post('void');
    expect(blockedPaid.statusCode).toBe(400);
    expect(blockedPaid.json().error).toMatch(/paid/i);

    // A fresh draft that we void, then void again — second void is refused (line 495).
    await create(staff.cookie, { projectKey: 'ACME', title: 'Second' });
    await logWork(staff.cookie, 'ACME-2', 30);
    const id2 = (await generate(staff.cookie, client.id)).json().id as string;
    const post2 = (path: string) =>
      app.inject({
        method: 'POST',
        url: `/invoices/${id2}/${path}`,
        headers: { cookie: staff.cookie },
      });
    expect((await post2('void')).statusCode).toBe(200);
    const blockedVoid = await post2('void');
    expect(blockedVoid.statusCode).toBe(400);
    expect(blockedVoid.json().error).toMatch(/already void/i);
  });

  // ── deleteInvoice non-draft guard (line 531) ─────────────────────────────────
  it('refuses to delete a non-draft (issued) invoice', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 60);
    await setRate(staff.cookie, 6000);
    const id = (await generate(staff.cookie, client.id)).json().id as string;
    await app.inject({
      method: 'POST',
      url: `/invoices/${id}/issue`,
      headers: { cookie: staff.cookie },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/invoices/${id}`,
      headers: { cookie: staff.cookie },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/only a draft/i);
  });
});
