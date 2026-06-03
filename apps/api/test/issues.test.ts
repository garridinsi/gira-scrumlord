// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('issues', () => {
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
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey, byName } = await seedProject({ reporterId: user.id });
    return { user, cookie, projectKey, byName };
  }

  const create = (app: FastifyInstance, cookie: string, payload: object) =>
    app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload });

  it('generates sequential keys and defaults to the first status', async () => {
    const { cookie, projectKey, byName } = await setup();
    const a = await create(app, cookie, { projectKey, title: 'First' });
    expect(a.statusCode).toBe(201);
    expect(a.json().key).toBe('GIRA-1');
    expect(a.json().statusId).toBe(byName.Backlog!.id);
    expect(a.json().rank).toBeTruthy();

    const b = await create(app, cookie, { projectKey, title: 'Second' });
    expect(b.json().key).toBe('GIRA-2');
  });

  it('emits an outbox event for emergency-priority issues', async () => {
    const { cookie, projectKey } = await setup();
    await create(app, cookie, { projectKey, title: 'PROD DOWN', priority: 'emergency' });
    const events = await prisma.outbox.count({ where: { type: 'issue.emergency' } });
    expect(events).toBe(1);
  });

  it('moving to a done status sets closedAt', async () => {
    const { cookie, projectKey, byName } = await setup();
    await create(app, cookie, { projectKey, title: 'Finish me' });
    const res = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { statusId: byName.Done!.id },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().closedAt).not.toBeNull();
  });

  it('filters by type and free-text search', async () => {
    const { cookie, projectKey } = await setup();
    await create(app, cookie, { projectKey, title: 'A normal task' });
    await create(app, cookie, { projectKey, title: 'Columns explode', type: 'bug' });

    const bugs = await app.inject({ method: 'GET', url: '/issues?type=bug', headers: { cookie } });
    expect(bugs.json()).toHaveLength(1);
    expect(bugs.json()[0].type).toBe('bug');

    const search = await app.inject({ method: 'GET', url: '/issues?q=explode', headers: { cookie } });
    expect(search.json()).toHaveLength(1);
    expect(search.json()[0].title).toContain('explode');
  });

  it('adds and lists comments', async () => {
    const { cookie, projectKey } = await setup();
    await create(app, cookie, { projectKey, title: 'Talk to me' });
    const add = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/comments',
      headers: { cookie },
      payload: { body: 'first!' },
    });
    expect(add.statusCode).toBe(201);
    const list = await app.inject({ method: 'GET', url: '/issues/GIRA-1/comments', headers: { cookie } });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].body).toBe('first!');
  });

  it('forbids a client from reading another client’s issue', async () => {
    const { cookie, projectKey } = await setup();
    await create(app, cookie, { projectKey, title: 'Secret' });
    const otherClient = await prisma.client.create({ data: { name: 'Other', slug: 'other' } });
    const intruder = await actingAs({ kind: 'client', role: 'viewer', clientId: otherClient.id });
    const res = await app.inject({
      method: 'GET',
      url: '/issues/GIRA-1',
      headers: { cookie: intruder.cookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects grafting another project’s sprint/label onto an issue (PATCH)', async () => {
    const { user, cookie, projectKey } = await setup();
    await create(app, cookie, { projectKey, title: 'Mine' }); // GIRA-1
    const other = await seedProject({ reporterId: user.id, key: 'OTHR' });
    const foreignSprint = (
      await app.inject({ method: 'POST', url: `/projects/${other.projectKey}/sprints`, headers: { cookie }, payload: { name: 'X' } })
    ).json().id;
    const foreignLabel = (
      await app.inject({ method: 'POST', url: `/projects/${other.projectKey}/labels`, headers: { cookie }, payload: { name: 'foreign' } })
    ).json().id;

    expect((await app.inject({ method: 'PATCH', url: '/issues/GIRA-1', headers: { cookie }, payload: { sprintId: foreignSprint } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'PATCH', url: '/issues/GIRA-1', headers: { cookie }, payload: { labelIds: [foreignLabel] } })).statusCode).toBe(400);
  });

  it('rejects grafting another project’s sprint/label onto an issue (POST create)', async () => {
    const { user, cookie, projectKey } = await setup();
    const other = await seedProject({ reporterId: user.id, key: 'OTHR' });
    const foreignSprint = (
      await app.inject({ method: 'POST', url: `/projects/${other.projectKey}/sprints`, headers: { cookie }, payload: { name: 'X' } })
    ).json().id;
    const foreignLabel = (
      await app.inject({ method: 'POST', url: `/projects/${other.projectKey}/labels`, headers: { cookie }, payload: { name: 'foreign' } })
    ).json().id;

    // createIssue must mirror PATCH's cross-project guards, else a forged POST grafts.
    expect((await create(app, cookie, { projectKey, title: 'graft', sprintId: foreignSprint })).statusCode).toBe(400);
    expect((await create(app, cookie, { projectKey, title: 'graft', labelIds: [foreignLabel] })).statusCode).toBe(400);
  });

  it('requires a price for fixed-price billing (create schema + patch over merged state)', async () => {
    const { cookie, projectKey } = await setup();
    // create: fixed with no price is rejected by the create schema refine
    expect((await create(app, cookie, { projectKey, title: 'fixed?', billingMode: 'fixed' })).statusCode).toBe(400);
    // create hourly, then PATCH to fixed without a price → rejected over the merged state
    await create(app, cookie, { projectKey, title: 'hourly' }); // GIRA-1
    const bad = await app.inject({ method: 'PATCH', url: '/issues/GIRA-1', headers: { cookie }, payload: { billingMode: 'fixed' } });
    expect(bad.statusCode).toBe(400);
    // PATCH to fixed WITH a price persists
    const ok = await app.inject({ method: 'PATCH', url: '/issues/GIRA-1', headers: { cookie }, payload: { billingMode: 'fixed', fixedPriceCents: 5000 } });
    expect(ok.statusCode).toBe(200);
    const row = await prisma.issue.findUnique({ where: { key: 'GIRA-1' } });
    expect(row!.billingMode).toBe('fixed');
    expect(row!.fixedPriceCents).toBe(5000);
  });

  it('round-trips a due date and emits a status-changed event on column moves', async () => {
    const { cookie, projectKey, byName } = await setup();
    const due = '2026-07-01T00:00:00.000Z';
    const created = await create(app, cookie, { projectKey, title: 'With deadline', dueAt: due });
    expect(created.json().dueAt).toBe(due);

    await app.inject({ method: 'PATCH', url: '/issues/GIRA-1', headers: { cookie }, payload: { statusId: byName['In Progress']!.id } });
    const event = await prisma.outbox.findFirst({ where: { type: 'issue.status_changed' } });
    expect(event).not.toBeNull();
    expect((event!.payload as { issueKey: string }).issueKey).toBe('GIRA-1');

    // Clearing the due date sticks.
    const cleared = await app.inject({ method: 'PATCH', url: '/issues/GIRA-1', headers: { cookie }, payload: { dueAt: null } });
    expect(cleared.json().dueAt).toBeNull();
  });
});
