// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs, makeUser } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('M4 intake + auto-assign', () => {
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

  async function setupSource(kind = 'grafana') {
    const { user, cookie } = await actingAs({ role: 'admin' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const project = await prisma.project.findUnique({ where: { key: projectKey } });
    const res = await app.inject({
      method: 'POST',
      url: '/intake-sources',
      headers: { cookie },
      payload: { name: 'grafana', kind, projectId: project!.id },
    });
    return { cookie, projectKey, projectId: project!.id, token: res.json().token, sourceId: res.json().id };
  }

  it('issues a one-time token and rejects a bad one', async () => {
    const { sourceId } = await setupSource();
    const bad = await app.inject({
      method: 'POST',
      url: `/intake/${sourceId}`,
      headers: { 'x-gira-token': 'wrong' },
      payload: {},
    });
    expect(bad.statusCode).toBe(401);
  });

  it('creates an emergency issue from a Grafana critical alert (+ outbox event) and dedups', async () => {
    const { sourceId, token, projectKey } = await setupSource('grafana');
    const payload = {
      status: 'firing',
      alerts: [
        {
          status: 'firing',
          fingerprint: 'fp-1',
          labels: { alertname: 'HighCPU', severity: 'critical' },
          annotations: { summary: 'CPU on fire', description: 'node-1' },
        },
      ],
    };
    const first = await app.inject({
      method: 'POST',
      url: `/intake/${sourceId}`,
      headers: { 'x-gira-token': token },
      payload,
    });
    expect(first.statusCode).toBe(202);
    expect(first.json().results[0].action).toBe('created');

    const issue = await prisma.issue.findFirst({ where: { externalRef: 'fp-1' } });
    expect(issue?.priority).toBe('emergency');
    expect(await prisma.outbox.count({ where: { type: 'issue.emergency' } })).toBe(1);

    // same fingerprint again → duplicate, no new issue
    const again = await app.inject({
      method: 'POST',
      url: `/intake/${sourceId}`,
      headers: { 'x-gira-token': token },
      payload,
    });
    expect(again.json().results[0].action).toBe('duplicate');
    expect(await prisma.issue.count({ where: { projectId: (await prisma.project.findUnique({ where: { key: projectKey } }))!.id } })).toBe(1);
  });

  it('closes the issue when Grafana resolves the alert', async () => {
    const { sourceId, token } = await setupSource('grafana');
    const fire = {
      alerts: [{ status: 'firing', fingerprint: 'fp-2', labels: { alertname: 'X', severity: 'warning' }, annotations: { summary: 'warn' } }],
    };
    await app.inject({ method: 'POST', url: `/intake/${sourceId}`, headers: { 'x-gira-token': token }, payload: fire });
    const resolved = {
      alerts: [{ status: 'resolved', fingerprint: 'fp-2', labels: { alertname: 'X', severity: 'warning' }, annotations: { summary: 'warn' } }],
    };
    const res = await app.inject({ method: 'POST', url: `/intake/${sourceId}`, headers: { 'x-gira-token': token }, payload: resolved });
    expect(res.json().results[0].action).toBe('resolved');
    const issue = await prisma.issue.findFirst({ where: { externalRef: 'fp-2' } });
    expect(issue?.closedAt).not.toBeNull();
  });

  it('auto-assigns a new intake issue via a matching rule', async () => {
    const { cookie, projectKey, sourceId, token } = await setupSource('grafana');
    const dev = await makeUser({ name: 'On-call Dev', role: 'member' });
    await app.inject({
      method: 'POST',
      url: `/projects/${projectKey}/assignment-rules`,
      headers: { cookie },
      payload: { assigneeId: dev.id, matchPriority: 'emergency' },
    });

    await app.inject({
      method: 'POST',
      url: `/intake/${sourceId}`,
      headers: { 'x-gira-token': token },
      payload: { alerts: [{ status: 'firing', fingerprint: 'fp-3', labels: { alertname: 'Y', severity: 'critical' }, annotations: { summary: 'boom' } }] },
    });
    const issue = await prisma.issue.findFirst({ where: { externalRef: 'fp-3' } });
    expect(issue?.assigneeId).toBe(dev.id);
  });

  it('creates a task from a WordPress submission', async () => {
    const { sourceId, token } = await setupSource('wordpress');
    const res = await app.inject({
      method: 'POST',
      url: `/intake/${sourceId}`,
      headers: { 'x-gira-token': token },
      payload: { subject: 'Contact form', message: 'hello', email: 'a@b.test' },
    });
    expect(res.json().results[0].action).toBe('created');
    const issue = await prisma.issue.findFirst({ where: { title: 'Contact form' } });
    expect(issue?.type).toBe('task');
  });
});
