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
});
