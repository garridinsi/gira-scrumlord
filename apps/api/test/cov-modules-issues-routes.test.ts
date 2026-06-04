// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage closure for src/modules/issues/routes.ts. The mainline issues.test.ts /
// mentions.test.ts already exercise the happy paths; this file targets the specific
// filter/PATCH/mentionable branches v8 still reports uncovered:
//   • GET /issues filter spreads: client tenant scoping (80), projectKey (81),
//     where.project assignment (84), statusId/assigneeId/priority/sprintId/labelId (85,86,88,89,90)
//   • PATCH cross-project parent that EXISTS but is foreign (163)
//   • PATCH assignee guards: inactive (182) and foreign-tenant client (183,184)
//   • PATCH description sanitize arm (200) and moscow:null clear arm (211)
//   • PATCH sprint/parent connect+disconnect ternary arms (221-226) and labelIds set (227)
//   • GET /issues/:key/mentionable staff branch on a CLIENTLESS project — the `: []` arm (380)
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs, makeUser } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('cov src/modules/issues/routes.ts', () => {
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

  const create = (cookie: string, payload: object) =>
    app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload });
  const patch = (cookie: string, key: string, payload: object) =>
    app.inject({ method: 'PATCH', url: `/issues/${key}`, headers: { cookie }, payload });

  // ── GET /issues filter spreads (81, 84, 85, 86, 88, 89, 90) ────────────────
  it('applies every list filter spread: projectKey/statusId/assigneeId/priority/sprintId/labelId', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey, byName } = await seedProject({ reporterId: user.id });
    const dev = await makeUser({ name: 'Dev', role: 'member' });

    const sprintId = (
      await app.inject({
        method: 'POST',
        url: `/projects/${projectKey}/sprints`,
        headers: { cookie },
        payload: { name: 'S1' },
      })
    ).json().id as string;
    const labelId = (
      await app.inject({
        method: 'POST',
        url: `/projects/${projectKey}/labels`,
        headers: { cookie },
        payload: { name: 'lbl' },
      })
    ).json().id as string;

    const created = await create(cookie, {
      projectKey,
      title: 'Filterable',
      assigneeId: dev.id,
      priority: 'high',
      sprintId,
      labelIds: [labelId],
    });
    expect(created.statusCode).toBe(201);
    const statusId = byName.Backlog!.id;

    // a noise issue that matches NONE of the filters below
    await create(cookie, { projectKey, title: 'Noise', priority: 'low' });

    const url =
      `/issues?projectKey=${projectKey}` +
      `&statusId=${statusId}` +
      `&assigneeId=${dev.id}` +
      `&priority=high` +
      `&sprintId=${sprintId}` +
      `&labelId=${labelId}`;
    const res = await app.inject({ method: 'GET', url, headers: { cookie } });
    expect(res.statusCode).toBe(200);
    const list = res.json() as Array<{ title: string }>;
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe('Filterable');
  });

  // ── GET /issues client tenant scoping (80, 84) ─────────────────────────────
  it('scopes the list to the caller’s tenant for a client user', async () => {
    const client = await prisma.client.create({
      data: { name: 'Acme', slug: 'acme-cov-list', currency: 'EUR' },
    });
    const staff = await actingAs({ role: 'member' });
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie: staff.cookie },
      payload: { key: 'CLT', name: 'Client Project', clientId: client.id },
    });
    await create(staff.cookie, { projectKey: 'CLT', title: 'Visible to client' });

    // a second project for a DIFFERENT tenant — must never appear in the client's list
    const other = await prisma.client.create({
      data: { name: 'Other', slug: 'other-cov-list', currency: 'EUR' },
    });
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie: staff.cookie },
      payload: { key: 'OTH', name: 'Other Project', clientId: other.id },
    });
    await create(staff.cookie, { projectKey: 'OTH', title: 'Foreign' });

    const portal = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    const res = await app.inject({
      method: 'GET',
      url: '/issues',
      headers: { cookie: portal.cookie },
    });
    expect(res.statusCode).toBe(200);
    const list = res.json() as Array<{ title: string }>;
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe('Visible to client');
  });

  // ── PATCH foreign-but-existing parent (163, second branch) ─────────────────
  it('rejects a parent that exists but belongs to another project (parentId guard)', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    await create(cookie, { projectKey, title: 'Child' }); // GIRA-1
    const other = await seedProject({ reporterId: user.id, key: 'OTHR' });
    await create(cookie, { projectKey: other.projectKey, title: 'Foreign parent' }); // OTHR-1
    const foreignParent = await prisma.issue.findUniqueOrThrow({ where: { key: 'OTHR-1' } });

    const res = await patch(cookie, 'GIRA-1', { parentId: foreignParent.id });
    expect(res.statusCode).toBe(400);
  });

  // ── PATCH assignee guards (182, 183, 184) ──────────────────────────────────
  it('rejects an inactive assignee and a foreign-tenant client assignee', async () => {
    const client = await prisma.client.create({
      data: { name: 'Acme', slug: 'acme-cov-assignee', currency: 'EUR' },
    });
    const otherClient = await prisma.client.create({
      data: { name: 'Other', slug: 'other-cov-assignee', currency: 'EUR' },
    });
    const staff = await actingAs({ role: 'member' });
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie: staff.cookie },
      payload: { key: 'ASG', name: 'Assignee Project', clientId: client.id },
    });
    await create(staff.cookie, { projectKey: 'ASG', title: 'Assign me' }); // ASG-1

    // (182) inactive staff user → invalid
    const ghost = await makeUser({ name: 'Ghost', role: 'member' });
    await prisma.user.update({ where: { id: ghost.id }, data: { isActive: false } });
    const inactiveRes = await patch(staff.cookie, 'ASG-1', { assigneeId: ghost.id });
    expect(inactiveRes.statusCode).toBe(400);

    // (183, 184) active client user from the WRONG tenant → invalid
    const foreignClientUser = await makeUser({
      name: 'Foreign',
      kind: 'client',
      role: 'viewer',
      clientId: otherClient.id,
    });
    const foreignRes = await patch(staff.cookie, 'ASG-1', { assigneeId: foreignClientUser.id });
    expect(foreignRes.statusCode).toBe(400);
  });

  // ── PATCH description sanitize arm (200) + moscow:null clear (211) ──────────
  it('sanitizes a patched description and clears moscow with null', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    await create(cookie, { projectKey, title: 'Doc', moscow: 'must' }); // GIRA-1

    const desc = await patch(cookie, 'GIRA-1', {
      description: 'safe <script>alert(1)</script> text',
    });
    expect(desc.statusCode).toBe(200);
    expect(desc.json().description).toBe('safe alert(1) text');

    const cleared = await patch(cookie, 'GIRA-1', { moscow: null });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json().moscow).toBeNull();
  });

  // ── PATCH sprint/parent connect+disconnect + labelIds set (221-227) ────────
  it('connects then disconnects a valid sprint and parent, and sets labels', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    await create(cookie, { projectKey, title: 'Parent' }); // GIRA-1
    await create(cookie, { projectKey, title: 'Child' }); // GIRA-2
    const parent = await prisma.issue.findUniqueOrThrow({ where: { key: 'GIRA-1' } });

    const sprintId = (
      await app.inject({
        method: 'POST',
        url: `/projects/${projectKey}/sprints`,
        headers: { cookie },
        payload: { name: 'S1' },
      })
    ).json().id as string;
    const labelId = (
      await app.inject({
        method: 'POST',
        url: `/projects/${projectKey}/labels`,
        headers: { cookie },
        payload: { name: 'lbl' },
      })
    ).json().id as string;

    // connect sprint (222 truthy), parent (225 truthy), set labels (227)
    const connected = await patch(cookie, 'GIRA-2', {
      sprintId,
      parentId: parent.id,
      labelIds: [labelId],
    });
    expect(connected.statusCode).toBe(200);
    expect(connected.json().sprintId).toBe(sprintId);
    expect(connected.json().parentId).toBe(parent.id);

    // disconnect sprint (222 falsy) and parent (225 falsy) via null
    const disconnected = await patch(cookie, 'GIRA-2', { sprintId: null, parentId: null });
    expect(disconnected.statusCode).toBe(200);
    expect(disconnected.json().sprintId).toBeNull();
    expect(disconnected.json().parentId).toBeNull();
  });

  // ── GET /issues/:key/mentionable: staff on a CLIENTLESS project (380, : [] arm) ─
  it('lists mentionable staff on a project with no client (clientless OR arm)', async () => {
    const { user, cookie } = await actingAs({ role: 'member', name: 'Author' });
    const { projectKey } = await seedProject({ reporterId: user.id, clientId: null });
    await create(cookie, { projectKey, title: 'No client here' }); // GIRA-1
    await makeUser({ name: 'Bea', role: 'member' });

    const res = await app.inject({
      method: 'GET',
      url: '/issues/GIRA-1/mentionable',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const names = (res.json() as Array<{ name: string }>).map((u) => u.name);
    expect(names).toContain('Bea');
    expect(names).not.toContain('Author'); // caller excludes self
  });
});
