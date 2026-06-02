// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('time tracking', () => {
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

  async function setupIssue() {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    await app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload: { projectKey, title: 'Work' } });
    return { user, cookie };
  }

  it('logs and lists worklogs', async () => {
    const { cookie } = await setupIssue();
    const add = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/worklogs',
      headers: { cookie },
      payload: { minutes: 90, note: 'deep work', billable: true },
    });
    expect(add.statusCode).toBe(201);
    expect(add.json().minutes).toBe(90);

    const list = await app.inject({ method: 'GET', url: '/issues/GIRA-1/worklogs', headers: { cookie } });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].note).toBe('deep work');
  });

  it('allows only one active timer per user', async () => {
    const { cookie } = await setupIssue();
    const first = await app.inject({ method: 'POST', url: '/timers/start', headers: { cookie }, payload: { issueKey: 'GIRA-1' } });
    expect(first.statusCode).toBe(201);
    const second = await app.inject({ method: 'POST', url: '/timers/start', headers: { cookie }, payload: { issueKey: 'GIRA-1' } });
    expect(second.statusCode).toBe(409);
  });

  it('stopping a timer writes a worklog with elapsed minutes and clears the timer', async () => {
    const { user, cookie } = await setupIssue();
    await app.inject({ method: 'POST', url: '/timers/start', headers: { cookie }, payload: { issueKey: 'GIRA-1' } });
    // Backdate the timer 90 minutes so elapsed time is deterministic.
    await prisma.timer.update({
      where: { userId: user.id },
      data: { startedAt: new Date(Date.now() - 90 * 60_000) },
    });

    const stop = await app.inject({ method: 'POST', url: '/timers/stop', headers: { cookie } });
    expect(stop.statusCode).toBe(200);
    expect(stop.json().minutes).toBeGreaterThanOrEqual(89);
    expect(stop.json().minutes).toBeLessThanOrEqual(91);

    const active = await app.inject({ method: 'GET', url: '/timers/active', headers: { cookie } });
    expect(active.json()).toBeNull();
  });

  it('stop without a running timer is 404', async () => {
    const { cookie } = await setupIssue();
    const stop = await app.inject({ method: 'POST', url: '/timers/stop', headers: { cookie } });
    expect(stop.statusCode).toBe(404);
  });

  it('lets the logger edit and delete their own worklog', async () => {
    const { cookie } = await setupIssue();
    const id = (
      await app.inject({
        method: 'POST',
        url: '/issues/GIRA-1/worklogs',
        headers: { cookie },
        payload: { minutes: 60, note: 'typo', billable: true },
      })
    ).json().id as string;

    const edit = await app.inject({
      method: 'PATCH',
      url: `/worklogs/${id}`,
      headers: { cookie },
      payload: { minutes: 45, note: 'fixed', billable: false },
    });
    expect(edit.statusCode).toBe(200);
    expect(edit.json()).toMatchObject({ minutes: 45, note: 'fixed', billable: false });

    const del = await app.inject({ method: 'DELETE', url: `/worklogs/${id}`, headers: { cookie } });
    expect(del.statusCode).toBe(204);
    expect(await prisma.worklog.count()).toBe(0);
  });

  it('forbids editing another user’s worklog (unless admin)', async () => {
    const { cookie } = await setupIssue();
    const id = (
      await app.inject({
        method: 'POST',
        url: '/issues/GIRA-1/worklogs',
        headers: { cookie },
        payload: { minutes: 60, billable: true },
      })
    ).json().id as string;

    const other = await actingAs({ role: 'member' });
    const denied = await app.inject({
      method: 'PATCH',
      url: `/worklogs/${id}`,
      headers: { cookie: other.cookie },
      payload: { minutes: 1 },
    });
    expect(denied.statusCode).toBe(403);

    const admin = await actingAs({ role: 'admin' });
    const ok = await app.inject({
      method: 'PATCH',
      url: `/worklogs/${id}`,
      headers: { cookie: admin.cookie },
      payload: { minutes: 30 },
    });
    expect(ok.statusCode).toBe(200);
  });

  it('refuses to edit/delete a worklog claimed by any annex (draft or finalized)', async () => {
    // Set up a client-linked project so we can invoice the worklog.
    const client = await prisma.client.create({ data: { name: 'C', slug: 'c', currency: 'EUR' } });
    const { user, cookie } = await actingAs({ role: 'admin' });
    await seedProject({ reporterId: user.id, key: 'BILL', clientId: client.id });
    await app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload: { projectKey: 'BILL', title: 'W' } });
    const wlId = (
      await app.inject({
        method: 'POST',
        url: '/issues/BILL-1/worklogs',
        headers: { cookie },
        payload: { minutes: 60, billable: true },
      })
    ).json().id as string;
    await app.inject({ method: 'POST', url: '/rates', headers: { cookie }, payload: { scope: 'default', hourlyCents: 6000 } });
    const invId = (await app.inject({ method: 'POST', url: `/clients/${client.id}/invoices`, headers: { cookie } })).json().id as string;

    // Lock-on-claim: even on a DRAFT annex the worklog is now frozen, because the
    // annex's subtotal/lines are frozen at generation and issuing does not recompute —
    // editing a claimed worklog would silently desync the document from the hours.
    const draftEdit = await app.inject({ method: 'PATCH', url: `/worklogs/${wlId}`, headers: { cookie }, payload: { note: 'draft edit' } });
    expect(draftEdit.statusCode).toBe(409);
    expect(draftEdit.json().error).toMatch(/draft annex/);

    // Issue the annex (finalize) — still refused, with the finalized-annex message.
    await app.inject({ method: 'POST', url: `/invoices/${invId}/issue`, headers: { cookie } });
    const finalEdit = await app.inject({ method: 'PATCH', url: `/worklogs/${wlId}`, headers: { cookie }, payload: { minutes: 1 } });
    expect(finalEdit.statusCode).toBe(409);
    expect(finalEdit.json().error).toMatch(/finalized annex/);
    expect((await app.inject({ method: 'DELETE', url: `/worklogs/${wlId}`, headers: { cookie } })).statusCode).toBe(409);
  });
});
