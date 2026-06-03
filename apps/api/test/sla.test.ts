// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('SLA policies + attainment (B2)', () => {
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
    const admin = await actingAs({ role: 'admin' });
    const { projectKey, byName } = await seedProject({ reporterId: admin.user.id });
    return { admin, projectKey, byName };
  }
  const create = (cookie: string, payload: object) =>
    app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload });
  const putPolicy = (cookie: string, key: string, body: object) =>
    app.inject({
      method: 'PUT',
      url: `/projects/${key}/sla-policies`,
      headers: { cookie },
      payload: body,
    });
  const sla = (cookie: string, issueKey: string) =>
    app
      .inject({ method: 'GET', url: `/issues/${issueKey}/sla`, headers: { cookie } })
      .then((r) => r.json());

  it('a project default SLA policy overrides the global env target', async () => {
    const { admin, projectKey } = await setup();
    await create(admin.cookie, { projectKey, title: 'X' }); // GIRA-1
    const put = await putPolicy(admin.cookie, projectKey, {
      responseMinutes: 120,
      resolutionMinutes: 600,
    });
    expect(put.statusCode).toBe(200);
    const s = await sla(admin.cookie, 'GIRA-1');
    expect(s.response.targetMinutes).toBe(120);
    expect(s.resolution.targetMinutes).toBe(600);
  });

  it('a priority-specific policy takes precedence over the project default', async () => {
    const { admin, projectKey } = await setup();
    await create(admin.cookie, { projectKey, title: 'Urgent one', priority: 'emergency' }); // GIRA-1
    await create(admin.cookie, { projectKey, title: 'Calm one', priority: 'low' }); // GIRA-2
    await putPolicy(admin.cookie, projectKey, { responseMinutes: 480, resolutionMinutes: 2400 }); // default
    await putPolicy(admin.cookie, projectKey, {
      priority: 'emergency',
      responseMinutes: 30,
      resolutionMinutes: 120,
    });

    expect((await sla(admin.cookie, 'GIRA-1')).response.targetMinutes).toBe(30); // emergency policy
    expect((await sla(admin.cookie, 'GIRA-2')).response.targetMinutes).toBe(480); // falls back to default
  });

  it('upsert replaces the existing policy for the same priority (no duplicate)', async () => {
    const { admin, projectKey } = await setup();
    await putPolicy(admin.cookie, projectKey, { responseMinutes: 100, resolutionMinutes: 200 });
    await putPolicy(admin.cookie, projectKey, { responseMinutes: 111, resolutionMinutes: 222 });
    const list = (
      await app.inject({
        method: 'GET',
        url: `/projects/${projectKey}/sla-policies`,
        headers: { cookie: admin.cookie },
      })
    ).json();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ responseMinutes: 111, resolutionMinutes: 222 });
  });

  it('computes project attainment over reached milestones', async () => {
    const { admin, projectKey, byName } = await setup();
    // A: resolved promptly → within target.
    await create(admin.cookie, { projectKey, title: 'Prompt' }); // GIRA-1
    await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie: admin.cookie },
      payload: { statusId: byName.Done!.id },
    });
    // B: backdated then resolved → breached.
    await create(admin.cookie, { projectKey, title: 'Stale' }); // GIRA-2
    await prisma.issue.update({
      where: { key: 'GIRA-2' },
      data: { createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
    });
    await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-2',
      headers: { cookie: admin.cookie },
      payload: { statusId: byName.Done!.id },
    });

    const att = (
      await app.inject({
        method: 'GET',
        url: `/projects/${projectKey}/sla/attainment`,
        headers: { cookie: admin.cookie },
      })
    ).json();
    expect(att.resolution).toMatchObject({ applicable: 2, met: 1, pct: 50 });
    expect(att.response).toMatchObject({ applicable: 2, met: 1, pct: 50 });
  });

  it('policy CRUD is admin-only; delete works; attainment is staff-only', async () => {
    const { admin, projectKey } = await setup();
    const created = (
      await putPolicy(admin.cookie, projectKey, { responseMinutes: 60, resolutionMinutes: 120 })
    ).json();
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/sla-policies/${created.id}`,
          headers: { cookie: admin.cookie },
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/sla-policies/${created.id}`,
          headers: { cookie: admin.cookie },
        })
      ).statusCode,
    ).toBe(404);

    const member = await actingAs({ role: 'member' });
    expect(
      (await putPolicy(member.cookie, projectKey, { responseMinutes: 60, resolutionMinutes: 120 }))
        .statusCode,
    ).toBe(403);
    // A client of another tenant can't read attainment for this (internal) project.
    const client = await prisma.client.create({
      data: { name: 'C', slug: 'c-sla', currency: 'EUR' },
    });
    const clientUser = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/projects/${projectKey}/sla/attainment`,
          headers: { cookie: clientUser.cookie },
        })
      ).statusCode,
    ).toBe(403);
  });
});
