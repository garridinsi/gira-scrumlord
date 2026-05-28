// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('money: rates + accrued cost', () => {
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

  const setRate = (cookie: string, body: object) =>
    app.inject({ method: 'POST', url: '/rates', headers: { cookie }, payload: body });

  it('resolves issue→project→client→default and bills hourly', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    await setRate(cookie, { scope: 'default', hourlyCents: 5000 });

    const created = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { cookie },
      payload: { projectKey, title: 'Billable' },
    });
    const issueId = created.json().id;
    await app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/worklogs',
      headers: { cookie },
      payload: { minutes: 90, billable: true },
    });

    // default rate: 90min @ 5000/h = 7500
    let cost = await app.inject({ method: 'GET', url: '/issues/GIRA-1/cost', headers: { cookie } });
    expect(cost.json()).toMatchObject({ billableMinutes: 90, hourlyCents: 5000, accruedCents: 7500 });

    // issue-level rate wins: 90min @ 12000/h = 18000
    await setRate(cookie, { scope: 'issue', issueId, hourlyCents: 12000 });
    cost = await app.inject({ method: 'GET', url: '/issues/GIRA-1/cost', headers: { cookie } });
    expect(cost.json()).toMatchObject({ hourlyCents: 12000, accruedCents: 18000 });
  });

  it('fixed-price issues ignore logged time', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    await setRate(cookie, { scope: 'default', hourlyCents: 5000 });
    await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { cookie },
      payload: { projectKey, title: 'Fixed', billingMode: 'fixed', fixedPriceCents: 25000 },
    });
    await app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/worklogs',
      headers: { cookie },
      payload: { minutes: 600, billable: true },
    });
    const cost = await app.inject({ method: 'GET', url: '/issues/GIRA-1/cost', headers: { cookie } });
    expect(cost.json()).toMatchObject({ billingMode: 'fixed', accruedCents: 25000 });
  });

  it('project summary rolls up time, money, and counts', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    await setRate(cookie, { scope: 'default', hourlyCents: 5000 });

    await app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload: { projectKey, title: 'Hourly' } });
    await app.inject({ method: 'POST', url: '/issues/GIRA-1/worklogs', headers: { cookie }, payload: { minutes: 120, billable: true } });
    await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { cookie },
      payload: { projectKey, title: 'Fixed', billingMode: 'fixed', fixedPriceCents: 25000 },
    });

    const summary = await app.inject({ method: 'GET', url: `/projects/${projectKey}/summary`, headers: { cookie } });
    const body = summary.json();
    expect(body.totalMinutes).toBe(120);
    expect(body.billableMinutes).toBe(120);
    expect(body.openIssues).toBe(2);
    expect(body.doneIssues).toBe(0);
    // GIRA-1: 120min @ 5000/h = 10000; GIRA-2 fixed 25000 => 35000
    expect(body.accruedCents).toBe(35000);
  });

  it('forbids client users from configuring rates', async () => {
    const client = await prisma.client.create({ data: { name: 'C', slug: 'c' } });
    const { cookie } = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    const res = await setRate(cookie, { scope: 'default', hourlyCents: 9999 });
    expect(res.statusCode).toBe(403);
  });

  it('rolls time + accrued cost up by calendar month (the monthly lens)', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    await setRate(cookie, { scope: 'default', hourlyCents: 6000 }); // €60/h
    const created = await app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload: { projectKey, title: 'Maint' } });
    const issueId = created.json().id as string;

    // Two worklogs in different calendar months (loggedAt set directly).
    await prisma.worklog.create({ data: { issueId, userId: user.id, minutes: 120, billable: true, loggedAt: new Date('2026-03-10T09:00:00Z') } });
    await prisma.worklog.create({ data: { issueId, userId: user.id, minutes: 60, billable: true, loggedAt: new Date('2026-04-02T09:00:00Z') } });

    const res = await app.inject({ method: 'GET', url: `/projects/${projectKey}/monthly`, headers: { cookie } });
    expect(res.statusCode).toBe(200);
    const months = res.json().months as Array<{ month: string; billableMinutes: number; accruedCents: number }>;
    expect(months.map((m) => m.month)).toEqual(['2026-04', '2026-03']); // most recent first
    expect(months[0]).toMatchObject({ billableMinutes: 60, accruedCents: 6000 }); // 1h @ 60
    expect(months[1]).toMatchObject({ billableMinutes: 120, accruedCents: 12000 }); // 2h @ 60
  });

  it('persists project cadence (sprints | monthly)', async () => {
    const { cookie } = await actingAs({ role: 'admin' });
    const made = await app.inject({ method: 'POST', url: '/projects', headers: { cookie }, payload: { key: 'MNT', name: 'Maintenance', cadence: 'monthly' } });
    expect(made.json().cadence).toBe('monthly');
    const patched = await app.inject({ method: 'PATCH', url: '/projects/MNT', headers: { cookie }, payload: { cadence: 'sprints' } });
    expect(patched.json().cadence).toBe('sprints');
  });

  it('carries the monthly retainer budget through to the monthly rollup', async () => {
    const { cookie } = await actingAs({ role: 'admin' });
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie },
      payload: { key: 'RET', name: 'Retainer', cadence: 'monthly', monthlyBudgetMinutes: 2400, monthlyBudgetCents: 240000 },
    });
    const res = await app.inject({ method: 'GET', url: '/projects/RET/monthly', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ budgetMinutes: 2400, budgetCents: 240000 });

    // Clearing the budget sticks.
    await app.inject({ method: 'PATCH', url: '/projects/RET', headers: { cookie }, payload: { monthlyBudgetMinutes: null } });
    expect((await app.inject({ method: 'GET', url: '/projects/RET/monthly', headers: { cookie } })).json().budgetMinutes).toBeNull();
  });
});
