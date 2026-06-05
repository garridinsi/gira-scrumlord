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
    // Admin so the full lifecycle (incl. the admin-only void/delete) is exercised.
    const staff = await actingAs({ role: 'admin' });
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
    expect(inv.number).toMatch(/^ANX-\d{4}-0001$/); // non-fiscal annex, not a TicketBAI invoice
    expect(inv.lines).toHaveLength(1);
    expect(inv.lines[0]).toMatchObject({
      issueKey: 'ACME-1',
      minutes: 120,
      hourlyCents: 6000,
      amountCents: 12000,
      kind: 'billable',
    });
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
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/clients/${client.id}/invoices`,
          headers: { cookie: staff.cookie },
        })
      ).json(),
    ).toEqual([]);
  });

  it('records the external TicketBAI fiscal-invoice reference on the annex', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 60);
    await setRate(staff.cookie, 6000);
    const id = (await generate(staff.cookie, client.id)).json().id as string;

    const set = await app.inject({
      method: 'POST',
      url: `/invoices/${id}/external-ref`,
      headers: { cookie: staff.cookie },
      payload: { externalInvoiceRef: 'TBAI-2026-000123' },
    });
    expect(set.statusCode).toBe(200);
    expect(set.json().externalInvoiceRef).toBe('TBAI-2026-000123');
    // and it persists on the fetched annex
    const got = await app.inject({
      method: 'GET',
      url: `/invoices/${id}`,
      headers: { cookie: staff.cookie },
    });
    expect(got.json().externalInvoiceRef).toBe('TBAI-2026-000123');
  });

  it('refuses to void an issued annex that is linked to a fiscal invoice until the ref is cleared', async () => {
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
    await app.inject({
      method: 'POST',
      url: `/invoices/${id}/external-ref`,
      headers: { cookie: staff.cookie },
      payload: { externalInvoiceRef: 'TBAI-2026-000999' },
    });

    // Voiding now would silently decouple the annex from its fiscal invoice → refused.
    const blocked = await app.inject({
      method: 'POST',
      url: `/invoices/${id}/void`,
      headers: { cookie: staff.cookie },
    });
    expect(blocked.statusCode).toBe(400);
    expect(blocked.json().error).toMatch(/fiscal/);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/invoices/${id}`,
          headers: { cookie: staff.cookie },
        })
      ).json().status,
    ).toBe('issued');

    // Clear the fiscal ref first, then voiding is allowed.
    await app.inject({
      method: 'POST',
      url: `/invoices/${id}/external-ref`,
      headers: { cookie: staff.cookie },
      payload: { externalInvoiceRef: '' },
    });
    const voided = await app.inject({
      method: 'POST',
      url: `/invoices/${id}/void`,
      headers: { cookie: staff.cookie },
    });
    expect(voided.statusCode).toBe(200);
    expect(voided.json().status).toBe('void');
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
      app.inject({
        method: 'POST',
        url: `/invoices/${id}/${path}`,
        headers: { cookie: staff.cookie },
      });

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
    expect(inv.lines[0]).toMatchObject({
      hourlyCents: null,
      amountCents: 50_000,
      minutes: 600,
      kind: 'fixed',
    });
    expect(inv.subtotalCents).toBe(50_000);
  });

  it('refuses to generate a fixed-price issue with no price set (no silent €0)', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Fixed no price' });
    await prisma.issue.update({
      where: { key: 'ACME-1' },
      data: { billingMode: 'fixed', fixedPriceCents: null },
    });
    await logWork(staff.cookie, 'ACME-1', 60);
    const gen = await generate(staff.cookie, client.id);
    expect(gen.statusCode).toBe(400);
    expect(gen.json().error ?? gen.json().message).toMatch(/fixed price/i);
  });

  it('does not reuse an existing annex number after a draft is deleted (max-based seq)', async () => {
    const { client, staff } = await setup();
    await setRate(staff.cookie, 6000);
    // Two annexes from two issues.
    await create(staff.cookie, { projectKey: 'ACME', title: 'A' });
    await logWork(staff.cookie, 'ACME-1', 30);
    const a = (await generate(staff.cookie, client.id)).json();
    expect(a.number).toMatch(/-0001$/);
    await create(staff.cookie, { projectKey: 'ACME', title: 'B' });
    await logWork(staff.cookie, 'ACME-2', 30);
    const b = (await generate(staff.cookie, client.id)).json();
    expect(b.number).toMatch(/-0002$/);

    // Delete the FIRST draft (frees A's hours). The old count-based numbering would
    // now generate ...-0002 again and collide; max-based yields ...-0003.
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/invoices/${a.id}`,
          headers: { cookie: staff.cookie },
        })
      ).statusCode,
    ).toBe(204);
    await create(staff.cookie, { projectKey: 'ACME', title: 'C' });
    await logWork(staff.cookie, 'ACME-3', 30);
    const c = await generate(staff.cookie, client.id);
    expect(c.statusCode).toBe(201);
    expect(c.json().number).toMatch(/-0003$/);
  });

  it('deleting a draft releases its worklogs so they can be re-invoiced', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 90);
    await setRate(staff.cookie, 6000);
    const id = (await generate(staff.cookie, client.id)).json().id as string;

    const del = await app.inject({
      method: 'DELETE',
      url: `/invoices/${id}`,
      headers: { cookie: staff.cookie },
    });
    expect(del.statusCode).toBe(204);
    // Worklog freed → a fresh annex can be generated again.
    const regen = await generate(staff.cookie, client.id);
    expect(regen.statusCode).toBe(201);
    expect(regen.json().subtotalCents).toBe(9000); // 90min @ 6000/h
  });

  it('charges a fixed price exactly once after a void + regenerate', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Fixed scope' });
    await prisma.issue.update({
      where: { key: 'ACME-1' },
      data: { billingMode: 'fixed', fixedPriceCents: 50_000 },
    });
    await logWork(staff.cookie, 'ACME-1', 120);
    await setRate(staff.cookie, 6000);

    const first = (await generate(staff.cookie, client.id)).json();
    expect(first.subtotalCents).toBe(50_000);
    await app.inject({
      method: 'POST',
      url: `/invoices/${first.id}/void`,
      headers: { cookie: staff.cookie },
    });

    // Regenerate: the cancelled annex freed the hours, so the price is billed once
    // on the new annex — not doubled, not lost.
    const second = (await generate(staff.cookie, client.id)).json();
    expect(second.lines).toHaveLength(1);
    expect(second.subtotalCents).toBe(50_000);
  });

  it('re-bills a fixed price after the charging annex is voided, even while another live annex holds the issue’s hours', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Fixed scope' });
    await prisma.issue.update({
      where: { key: 'ACME-1' },
      data: { billingMode: 'fixed', fixedPriceCents: 50_000 },
    });
    await setRate(staff.cookie, 6000);

    // Annex A charges the €500 fixed line and claims w1.
    await logWork(staff.cookie, 'ACME-1', 60);
    const a = (await generate(staff.cookie, client.id)).json();
    expect(a.subtotalCents).toBe(50_000);

    // More hours (w2) → annex B. The price is already on live A, so B carries no price
    // line but still CLAIMS w2 — B stays live holding hours of the same issue.
    await logWork(staff.cookie, 'ACME-1', 30);
    const b = (await generate(staff.cookie, client.id)).json();
    expect(b.subtotalCents).toBe(0);

    // Void A (frees w1). The only annex that ever charged the price is now void; B (live)
    // holds only hours. The price MUST be re-billable. The old worklog-claim predicate
    // lost it here: B's claim made the issue look "already billed", so €500 vanished.
    await app.inject({
      method: 'POST',
      url: `/invoices/${a.id}/void`,
      headers: { cookie: staff.cookie },
    });
    const c = (await generate(staff.cookie, client.id)).json();
    expect(
      c.lines.some(
        (l: { hourlyCents: number | null; amountCents: number }) =>
          l.hourlyCents === null && l.amountCents === 50_000,
      ),
    ).toBe(true);
    expect(c.subtotalCents).toBe(50_000);
  });

  it('bills the fixed price after an issue is switched from hourly to fixed (hours already billed hourly)', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Mode switch' });
    await setRate(staff.cookie, 6000);

    // Billed hourly first (an hourly line, hourlyCents set).
    await logWork(staff.cookie, 'ACME-1', 60);
    const a = (await generate(staff.cookie, client.id)).json();
    expect(a.lines[0]).toMatchObject({ hourlyCents: 6000, amountCents: 6000 });

    // Switch to fixed; log more hours; generate. The earlier HOURLY claim must NOT
    // suppress the fixed price — the old predicate skipped the price line entirely.
    await prisma.issue.update({
      where: { key: 'ACME-1' },
      data: { billingMode: 'fixed', fixedPriceCents: 50_000 },
    });
    await logWork(staff.cookie, 'ACME-1', 30);
    const b = (await generate(staff.cookie, client.id)).json();
    expect(
      b.lines.some(
        (l: { hourlyCents: number | null; amountCents: number }) =>
          l.hourlyCents === null && l.amountCents === 50_000,
      ),
    ).toBe(true);
    expect(b.subtotalCents).toBe(50_000);
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
      (
        await app.inject({
          method: 'GET',
          url: `/clients/${client.id}/invoices`,
          headers: { cookie: clientUser.cookie },
        })
      ).statusCode,
    ).toBe(403);

    // A draft is invisible in the portal…
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/portal/invoices',
          headers: { cookie: clientUser.cookie },
        })
      ).json(),
    ).toEqual([]);
    // …and a client can't fetch a draft by id (404, never confirm it exists).
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/portal/invoices/${id}`,
          headers: { cookie: clientUser.cookie },
        })
      ).statusCode,
    ).toBe(404);

    // Once issued, it appears in the portal.
    await app.inject({
      method: 'POST',
      url: `/invoices/${id}/issue`,
      headers: { cookie: staff.cookie },
    });
    const portal = await app.inject({
      method: 'GET',
      url: '/portal/invoices',
      headers: { cookie: clientUser.cookie },
    });
    expect(portal.json()).toHaveLength(1);
    expect(portal.json()[0].id).toBe(id);

    // …but once VOIDED it disappears again — a cancelled annex must not show to the client.
    await app.inject({
      method: 'POST',
      url: `/invoices/${id}/void`,
      headers: { cookie: staff.cookie },
    });
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/portal/invoices',
          headers: { cookie: clientUser.cookie },
        })
      ).json(),
    ).toEqual([]);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/portal/invoices/${id}`,
          headers: { cookie: clientUser.cookie },
        })
      ).statusCode,
    ).toBe(404);
  });

  it('lets a member generate/issue/pay but reserves void & delete for admins', async () => {
    const { client, staff } = await setup(); // staff = admin (seeds the project)
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 60);
    await setRate(staff.cookie, 6000);

    const member = await actingAs({ role: 'member' });
    // A member can run the normal lifecycle…
    const draft = await generate(member.cookie, client.id);
    expect(draft.statusCode).toBe(201);
    const id = draft.json().id as string;
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/invoices/${id}/issue`,
          headers: { cookie: member.cookie },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/invoices/${id}/pay`,
          headers: { cookie: member.cookie },
        })
      ).statusCode,
    ).toBe(200);
    // …but NOT the destructive ones.
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/invoices/${id}/void`,
          headers: { cookie: member.cookie },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/invoices/${id}`,
          headers: { cookie: member.cookie },
        })
      ).statusCode,
    ).toBe(403);
  });

  it('a viewer can read invoices but not generate them', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 60);
    await setRate(staff.cookie, 6000);

    const viewer = await actingAs({ role: 'viewer' });
    expect((await generate(viewer.cookie, client.id)).statusCode).toBe(403);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/clients/${client.id}/invoices`,
          headers: { cookie: viewer.cookie },
        })
      ).statusCode,
    ).toBe(200);
  });

  it('bills the same worklogs the monthly view attributes to a month (TZ-aware period)', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Late-night maintenance' });
    await setRate(staff.cookie, 6000); // €60/h

    // 22:30 UTC on Apr 30 is 00:30 on May 1 in Europe/Madrid (CEST, UTC+2): the
    // monthly rollup attributes it to May, and a UTC-naive May period would have
    // EXCLUDED it. The TZ-aware period must include it so the two agree.
    await app.inject({
      method: 'POST',
      url: '/issues/ACME-1/worklogs',
      headers: { cookie: staff.cookie },
      payload: { minutes: 120, billable: true, loggedAt: '2026-04-30T22:30:00.000Z' },
    });

    // What does the monthly lens attribute to 2026-05?
    const monthly = await app.inject({
      method: 'GET',
      url: '/projects/ACME/monthly',
      headers: { cookie: staff.cookie },
    });
    const may = monthly.json().months.find((m: { month: string }) => m.month === '2026-05');
    expect(may).toMatchObject({ billableMinutes: 120, accruedCents: 12000 });

    // The May annex must bill exactly that.
    const gen = await generate(staff.cookie, client.id, {
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
    });
    expect(gen.statusCode).toBe(201);
    expect(gen.json().subtotalCents).toBe(may.accruedCents);
    expect(gen.json().lines[0]).toMatchObject({ issueKey: 'ACME-1', minutes: 120 });
  });

  it('excludes a worklog at the start of next month from the earlier annex (half-open end)', async () => {
    const { client, staff } = await setup();
    await create(staff.cookie, { projectKey: 'ACME', title: 'Boundary' });
    await setRate(staff.cookie, 6000);
    const logAt = (loggedAt: string, minutes: number) =>
      app.inject({
        method: 'POST',
        url: '/issues/ACME-1/worklogs',
        headers: { cookie: staff.cookie },
        payload: { minutes, billable: true, loggedAt },
      });

    // 22:00:00Z = Jun 1 00:00 Madrid (CEST) → monthKey June → must NOT bill on May annex.
    await logAt('2026-05-31T22:00:00.000Z', 60);
    // 21:59:59Z = May 31 23:59:59 Madrid → May → must bill on May annex.
    await logAt('2026-05-31T21:59:59.000Z', 30);

    const gen = await generate(staff.cookie, client.id, {
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
    });
    expect(gen.statusCode).toBe(201);
    // Only the 30-min May worklog is billed — the start-of-June one is excluded.
    expect(gen.json().lines[0].minutes).toBe(30);
    expect(gen.json().subtotalCents).toBe(3000);
  });

  it('refuses to bill a rate whose currency differs from the client currency', async () => {
    const { client, staff } = await setup(); // client currency EUR
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logWork(staff.cookie, 'ACME-1', 60);
    // A default (no-client) rate in USD resolves for this EUR client — generation
    // must refuse rather than bill the USD number under an EUR label.
    await app.inject({
      method: 'POST',
      url: '/rates',
      headers: { cookie: staff.cookie },
      payload: { scope: 'default', hourlyCents: 6000, currency: 'USD' },
    });
    const gen = await generate(staff.cookie, client.id);
    expect(gen.statusCode).toBe(400);
    expect(gen.json().error ?? gen.json().message).toMatch(/currency/i);
  });

  it('rejects saving a client/project rate in a different currency than the client', async () => {
    const { client, staff } = await setup(); // EUR client
    const mismatch = await app.inject({
      method: 'POST',
      url: '/rates',
      headers: { cookie: staff.cookie },
      payload: { scope: 'client', clientId: client.id, hourlyCents: 9000, currency: 'USD' },
    });
    expect(mismatch.statusCode).toBe(400);
    expect(mismatch.json().error ?? mismatch.json().message).toMatch(/currency/i);
    // The matching currency is accepted.
    const ok = await app.inject({
      method: 'POST',
      url: '/rates',
      headers: { cookie: staff.cookie },
      payload: { scope: 'client', clientId: client.id, hourlyCents: 9000, currency: 'EUR' },
    });
    expect(ok.statusCode).toBe(201);
  });

  // ── B3: flat-retainer fee + per-issue coverage ───────────────────────────────
  // The retainer is a flat monthly fee line. What's billed ON TOP is decided per issue:
  // hourly issues bill T&M, "covered" issues show €0. No hour pooling, no overage.
  const contract = (clientId: string, over: Record<string, unknown> = {}) =>
    prisma.contract.create({
      data: { clientId, name: 'Retainer', retainerCents: 500_000, status: 'active', ...over },
    });
  const logAt = (cookie: string, key: string, minutes: number, loggedAt: string) =>
    app.inject({
      method: 'POST',
      url: `/issues/${key}/worklogs`,
      headers: { cookie },
      payload: { minutes, billable: true, loggedAt },
    });
  const setMode = (key: string, billingMode: 'hourly' | 'fixed' | 'covered', fixedPriceCents = 0) =>
    prisma.issue.update({ where: { key }, data: { billingMode, fixedPriceCents } });
  const MARCH = { periodStart: '2026-03-01', periodEnd: '2026-03-31' };
  type Line = { issueKey: string; kind: string; minutes: number; amountCents: number };
  const lineFor = (inv: { lines: Line[] }, key: string) =>
    inv.lines.find((l) => l.issueKey === key);

  it('adds a flat retainer fee and bills hourly work T&M ON TOP (no pooling)', async () => {
    const { client, staff } = await setup();
    await contract(client.id, { retainerCents: 500_000 });
    await setRate(staff.cookie, 6000); // €60/h
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logAt(staff.cookie, 'ACME-1', 300, '2026-03-15T12:00:00.000Z'); // 5h hourly
    const inv = (await generate(staff.cookie, client.id, MARCH)).json();
    // Flat fee + 5h @ €60 billed on top — hourly is NOT folded into the retainer.
    expect(inv.subtotalCents).toBe(500_000 + 30_000);
    expect(lineFor(inv, 'RETAINER')).toMatchObject({ amountCents: 500_000, kind: 'retainer' });
    expect(lineFor(inv, 'ACME-1')).toMatchObject({
      minutes: 300,
      hourlyCents: 6000,
      amountCents: 30_000,
      kind: 'billable',
    });
    expect(inv.lines.some((l: Line) => l.issueKey === 'OVERAGE')).toBe(false);
  });

  it('shows a "covered" issue at €0 under a retainer (folded into the fee)', async () => {
    const { client, staff } = await setup();
    await contract(client.id, { retainerCents: 500_000 });
    await setRate(staff.cookie, 6000);
    await create(staff.cookie, { projectKey: 'ACME', title: 'Maintenance work' });
    await setMode('ACME-1', 'covered');
    await logAt(staff.cookie, 'ACME-1', 300, '2026-03-15T12:00:00.000Z');
    const inv = (await generate(staff.cookie, client.id, MARCH)).json();
    expect(inv.subtotalCents).toBe(500_000); // only the flat fee; the work is covered
    const covered = lineFor(inv, 'ACME-1');
    expect(covered).toMatchObject({
      minutes: 300,
      amountCents: 0,
      hourlyCents: null,
      kind: 'covered',
    });
    expect(covered?.['description' as keyof Line]).toMatch(/cubierto|covered/i);
  });

  it('combines billable + covered + fixed issues on ONE retainer annex', async () => {
    const { client, staff } = await setup();
    await contract(client.id, { retainerCents: 500_000 });
    await setRate(staff.cookie, 6000); // €60/h
    await create(staff.cookie, { projectKey: 'ACME', title: 'Extra hourly work' });
    await create(staff.cookie, { projectKey: 'ACME', title: 'In-maintenance ticket' });
    await create(staff.cookie, { projectKey: 'ACME', title: 'One-off project' });
    await setMode('ACME-2', 'covered');
    await setMode('ACME-3', 'fixed', 50_000);
    await logAt(staff.cookie, 'ACME-1', 120, '2026-03-15T12:00:00.000Z'); // 2h → €120 hourly
    await logAt(staff.cookie, 'ACME-2', 90, '2026-03-15T12:00:00.000Z'); // covered → €0
    await logAt(staff.cookie, 'ACME-3', 60, '2026-03-15T12:00:00.000Z'); // fixed → €500
    const inv = (await generate(staff.cookie, client.id, MARCH)).json();
    expect(lineFor(inv, 'RETAINER')).toMatchObject({ amountCents: 500_000, kind: 'retainer' });
    expect(lineFor(inv, 'ACME-1')).toMatchObject({ amountCents: 12_000, kind: 'billable' });
    expect(lineFor(inv, 'ACME-2')).toMatchObject({ amountCents: 0, kind: 'covered' });
    expect(lineFor(inv, 'ACME-3')).toMatchObject({ amountCents: 50_000, kind: 'fixed' });
    expect(inv.subtotalCents).toBe(500_000 + 12_000 + 50_000); // covered adds nothing
  });

  it('bills the flat retainer fee even for a zero-hours month', async () => {
    const { client, staff } = await setup();
    await contract(client.id, { retainerCents: 250_000 });
    const gen = await generate(staff.cookie, client.id, MARCH); // no worklogs at all
    expect(gen.statusCode).toBe(201);
    expect(gen.json().subtotalCents).toBe(250_000);
    expect(gen.json().lines.map((l: Line) => l.issueKey)).toEqual(['RETAINER']);
  });

  it('refuses an hourly issue with no rate, even under a retainer (no silent €0)', async () => {
    const { client, staff } = await setup();
    await contract(client.id, { retainerCents: 100_000 });
    await create(staff.cookie, { projectKey: 'ACME', title: 'Unrated work' });
    await logAt(staff.cookie, 'ACME-1', 300, '2026-03-15T12:00:00.000Z'); // hourly, but no rate set
    const gen = await generate(staff.cookie, client.id, MARCH);
    expect(gen.statusCode).toBe(400);
    expect(gen.json().error).toMatch(/rate/i);
  });

  it('shows a covered issue at €0 even WITHOUT a retainer (pure non-billable)', async () => {
    const { client, staff } = await setup(); // no contract
    await setRate(staff.cookie, 6000);
    await create(staff.cookie, { projectKey: 'ACME', title: 'Goodwill fix' });
    await setMode('ACME-1', 'covered');
    await logAt(staff.cookie, 'ACME-1', 300, '2026-03-15T12:00:00.000Z');
    const inv = (await generate(staff.cookie, client.id, MARCH)).json();
    expect(inv.lines.some((l: Line) => l.issueKey === 'RETAINER')).toBe(false);
    expect(lineFor(inv, 'ACME-1')).toMatchObject({ amountCents: 0, kind: 'covered' });
    expect(inv.subtotalCents).toBe(0);
  });

  it('leaves non-retainer clients on the pure T&M path (no retainer line)', async () => {
    const { client, staff } = await setup(); // no contract
    await setRate(staff.cookie, 6000);
    await create(staff.cookie, { projectKey: 'ACME', title: 'Work' });
    await logAt(staff.cookie, 'ACME-1', 120, '2026-03-15T12:00:00.000Z');
    const inv = (await generate(staff.cookie, client.id, MARCH)).json();
    expect(inv.lines.some((l: Line) => l.issueKey === 'RETAINER')).toBe(false);
    expect(inv.subtotalCents).toBe(12_000); // 2h @ €60
  });
});
