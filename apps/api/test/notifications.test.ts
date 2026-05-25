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
