// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('notifications + incidents API', () => {
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

  it('creates an email channel and rejects a bad target', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const ok = await app.inject({
      method: 'POST',
      url: '/channels',
      headers: { cookie },
      payload: { name: 'oncall', kind: 'email', target: 'oncall@example.test', events: ['issue.emergency'] },
    });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().kind).toBe('email');

    const bad = await app.inject({
      method: 'POST',
      url: '/channels',
      headers: { cookie },
      payload: { name: 'bad', kind: 'webhook', target: 'not-a-url', events: ['issue.emergency'] },
    });
    expect(bad.statusCode).toBe(400);
  });

  it('test-sends a notification (email via jsonTransport)', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const ch = await app.inject({
      method: 'POST',
      url: '/channels',
      headers: { cookie },
      payload: { name: 'oncall', kind: 'email', target: 'oncall@example.test', events: ['issue.emergency'] },
    });
    const res = await app.inject({ method: 'POST', url: `/channels/${ch.json().id}/test`, headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('forbids client users from configuring channels', async () => {
    const client = await prisma.client.create({ data: { name: 'C', slug: 'c' } });
    const { cookie } = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    const res = await app.inject({
      method: 'POST',
      url: '/channels',
      headers: { cookie },
      payload: { name: 'x', kind: 'email', target: 'x@example.test', events: ['issue.emergency'] },
    });
    expect(res.statusCode).toBe(403);
  });

  it('lists incidents and acknowledges one', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const created = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { cookie },
      payload: { projectKey, title: 'PROD DOWN', priority: 'emergency' },
    });
    // simulate the dispatcher opening an incident for the emergency issue
    const incident = await prisma.incident.create({
      data: { issueId: created.json().id, status: 'open' },
    });

    const list = await app.inject({ method: 'GET', url: '/incidents?status=open', headers: { cookie } });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].issueKey).toBe('GIRA-1');

    const ack = await app.inject({ method: 'POST', url: `/incidents/${incident.id}/ack`, headers: { cookie } });
    expect(ack.statusCode).toBe(200);
    expect(ack.json().status).toBe('acked');

    const resolve = await app.inject({ method: 'POST', url: `/incidents/${incident.id}/resolve`, headers: { cookie } });
    expect(resolve.statusCode).toBe(200);
    expect(resolve.json().status).toBe('resolved');
  });

  it('refuses an SSRF-prone webhook target at write time', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    for (const target of ['http://169.254.169.254/latest/meta-data', 'http://localhost:6660/audit', 'http://127.0.0.1/']) {
      const res = await app.inject({
        method: 'POST',
        url: '/channels',
        headers: { cookie },
        payload: { name: 'evil', kind: 'webhook', target, events: ['issue.emergency'] },
      });
      expect(res.statusCode).toBe(400);
    }
  });

  it('lists, project-scopes, patches, and deletes channels; test/ack/resolve 404 cleanly', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const project = await prisma.project.findUnique({ where: { key: projectKey } });

    const ch = (
      await app.inject({ method: 'POST', url: '/channels', headers: { cookie }, payload: { name: 'oncall', kind: 'email', target: 'a@b.test', events: ['issue.emergency'] } })
    ).json();

    // list
    const list = await app.inject({ method: 'GET', url: '/channels', headers: { cookie } });
    expect(list.json().map((c: { id: string }) => c.id)).toContain(ch.id);

    // a project-scoped channel resolves its project…
    const scoped = await app.inject({
      method: 'POST',
      url: '/channels',
      headers: { cookie },
      payload: { name: 'proj', kind: 'email', target: 'p@x.test', scope: 'project', projectId: project!.id, events: ['issue.status_changed'] },
    });
    expect(scoped.statusCode).toBe(201);
    // …and rejects an unknown project (well-formed cuid that doesn't exist → 404).
    const badProj = await app.inject({
      method: 'POST',
      url: '/channels',
      headers: { cookie },
      payload: {
        name: 'np',
        kind: 'email',
        target: 'p@x.test',
        scope: 'project',
        projectId: 'claaaaaaaaaaaaaaaaaaaaaaaa',
        events: ['issue.status_changed'],
      },
    });
    expect(badProj.statusCode).toBe(404);

    // patch (name) then delete (audited); a second delete 404s.
    expect((await app.inject({ method: 'PATCH', url: `/channels/${ch.id}`, headers: { cookie }, payload: { name: 'renamed' } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'DELETE', url: `/channels/${ch.id}`, headers: { cookie } })).statusCode).toBe(204);
    expect((await app.inject({ method: 'DELETE', url: `/channels/${ch.id}`, headers: { cookie } })).statusCode).toBe(404);

    // missing ids 404 across the verbs.
    expect((await app.inject({ method: 'POST', url: '/channels/nope/test', headers: { cookie } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/incidents/nope/ack', headers: { cookie } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/incidents/nope/resolve', headers: { cookie } })).statusCode).toBe(404);
  });

  it('scopes the incident list to the client’s own projects', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const created = await app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload: { projectKey, title: 'DOWN', priority: 'emergency' } });
    await prisma.incident.create({ data: { issueId: created.json().id, status: 'open' } });

    // A client of an unrelated client sees no incidents (the client-scoped where-branch).
    const other = await prisma.client.create({ data: { name: 'Other', slug: 'other' } });
    const outsider = await actingAs({ kind: 'client', role: 'viewer', clientId: other.id });
    const list = await app.inject({ method: 'GET', url: '/incidents', headers: { cookie: outsider.cookie } });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(0);
  });

  it('refuses cross-origin mutations (CSRF guard)', async () => {
    const evil = await app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      headers: { origin: 'https://evil.example' },
      payload: { email: 'boss@example.test' },
    });
    expect(evil.statusCode).toBe(403);
  });
});
