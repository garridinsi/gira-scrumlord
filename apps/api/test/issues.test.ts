// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs, makeUser } from './helpers/auth.js';
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

    const search = await app.inject({
      method: 'GET',
      url: '/issues?q=explode',
      headers: { cookie },
    });
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
    const list = await app.inject({
      method: 'GET',
      url: '/issues/GIRA-1/comments',
      headers: { cookie },
    });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].body).toBe('first!');
  });

  it('PATCH validation + disconnect branches, emergency escalation emit, and audited DELETE', async () => {
    const { cookie, projectKey } = await setup();
    const dev = await makeUser({ name: 'Dev', role: 'member' });
    await create(app, cookie, { projectKey, title: 'X', assigneeId: dev.id, storyPoints: 3 }); // GIRA-1

    // invalid statusId / parentId are rejected (the validation branches).
    const fakeId = 'claaaaaaaaaaaaaaaaaaaaaaaa';
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/issues/GIRA-1',
          headers: { cookie },
          payload: { statusId: fakeId },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/issues/GIRA-1',
          headers: { cookie },
          payload: { parentId: fakeId },
        })
      ).statusCode,
    ).toBe(400);

    // disconnect the assignee (the null → disconnect branch).
    const cleared = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { assigneeId: null },
    });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json().assignee).toBeNull();

    // escalating priority to emergency emits the paging event.
    await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { priority: 'emergency' },
    });
    expect(await prisma.outbox.count({ where: { type: 'issue.emergency' } })).toBe(1);

    // DELETE removes the issue and records an audit row.
    expect(
      (await app.inject({ method: 'DELETE', url: '/issues/GIRA-1', headers: { cookie } }))
        .statusCode,
    ).toBe(204);
    expect((await prisma.auditLog.findMany({ where: { action: 'issue.delete' } })).length).toBe(1);
  });

  it('marks and clears an issue as blocked (D1)', async () => {
    const { cookie, projectKey } = await setup();
    await create(app, cookie, { projectKey, title: 'Stuck' }); // GIRA-1
    const blocked = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { blockedReason: 'waiting on client API key' },
    });
    expect(blocked.statusCode).toBe(200);
    expect(blocked.json().blockedReason).toBe('waiting on client API key');
    const unblocked = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { blockedReason: null },
    });
    expect(unblocked.json().blockedReason).toBeNull();
  });

  it('counts reopens when a done issue moves back to open (D2)', async () => {
    const { cookie, projectKey, byName } = await setup();
    await create(app, cookie, { projectKey, title: 'Recurring bug' }); // GIRA-1
    await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { statusId: byName.Done!.id },
    });
    const reopened = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { statusId: byName['In Progress']!.id },
    });
    expect(reopened.json().reopenCount).toBe(1);
    await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { statusId: byName.Done!.id },
    });
    const again = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { statusId: byName['To Do']!.id },
    });
    expect(again.json().reopenCount).toBe(2);
  });

  it('records MoSCoW prioritization on create + patch (D7)', async () => {
    const { cookie, projectKey } = await setup();
    const created = await create(app, cookie, { projectKey, title: 'Feature', moscow: 'must' });
    expect(created.json().moscow).toBe('must');
    const patched = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { moscow: 'could' },
    });
    expect(patched.json().moscow).toBe('could');
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/issues/GIRA-1',
          headers: { cookie },
          payload: { moscow: 'nonsense' },
        })
      ).statusCode,
    ).toBe(400);
  });

  it('records bug severity on create and via patch (D3)', async () => {
    const { cookie, projectKey } = await setup();
    const created = await create(app, cookie, {
      projectKey,
      title: 'Crash',
      type: 'bug',
      severity: 'critical',
    });
    expect(created.json().severity).toBe('critical');
    const patched = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { severity: 'minor' },
    });
    expect(patched.json().severity).toBe('minor');
    const cleared = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { severity: null },
    });
    expect(cleared.json().severity).toBeNull();
    // an invalid severity is rejected by the enum
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/issues/GIRA-1',
          headers: { cookie },
          payload: { severity: 'sev0' },
        })
      ).statusCode,
    ).toBe(400);
  });

  it('hides internal comments from client/portal viewers; clients can’t post internal (N1)', async () => {
    const client = await prisma.client.create({ data: { name: 'AcmeN1', slug: 'acmen1' } });
    const staff = await actingAs({ role: 'member' });
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie: staff.cookie },
      payload: { key: 'NVP', name: 'Visibility', clientId: client.id },
    });
    await create(app, staff.cookie, { projectKey: 'NVP', title: 'Issue' }); // NVP-1

    await app.inject({
      method: 'POST',
      url: '/issues/NVP-1/comments',
      headers: { cookie: staff.cookie },
      payload: { body: 'visible to client' },
    });
    await app.inject({
      method: 'POST',
      url: '/issues/NVP-1/comments',
      headers: { cookie: staff.cookie },
      payload: { body: 'STAFF ONLY note', visibility: 'internal' },
    });

    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/issues/NVP-1/comments',
          headers: { cookie: staff.cookie },
        })
      ).json(),
    ).toHaveLength(2);

    const portal = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    const clientList = await app.inject({
      method: 'GET',
      url: '/issues/NVP-1/comments',
      headers: { cookie: portal.cookie },
    });
    expect(clientList.json()).toHaveLength(1);
    expect(clientList.json()[0].body).toBe('visible to client');
    expect(clientList.json().some((c: { body: string }) => c.body.includes('STAFF ONLY'))).toBe(
      false,
    );

    // A client author can NEVER create an internal note — forced to 'client'.
    const posted = await app.inject({
      method: 'POST',
      url: '/issues/NVP-1/comments',
      headers: { cookie: portal.cookie },
      payload: { body: 'from client', visibility: 'internal' },
    });
    expect(posted.json().visibility).toBe('client');
  });

  it('lets a client comment on their own project’s issue', async () => {
    const client = await prisma.client.create({ data: { name: 'Acme', slug: 'acme' } });
    const staff = await actingAs({ role: 'member' });
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie: staff.cookie },
      payload: { key: 'CLP', name: 'Client Project', clientId: client.id },
    });
    await create(app, staff.cookie, { projectKey: 'CLP', title: 'Portal issue' });

    const portal = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    const add = await app.inject({
      method: 'POST',
      url: '/issues/CLP-1/comments',
      headers: { cookie: portal.cookie },
      payload: { body: 'from the client' },
    });
    expect(add.statusCode).toBe(201);
    expect(add.json().body).toBe('from the client');
  });

  it('records and clears an issue resolution (D2)', async () => {
    const { cookie, projectKey } = await setup();
    await create(app, cookie, { projectKey, title: 'Bug' }); // GIRA-1
    const res = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { resolution: 'fixed' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().resolution).toBe('fixed');
    expect(
      (await app.inject({ method: 'GET', url: '/issues/GIRA-1', headers: { cookie } })).json()
        .resolution,
    ).toBe('fixed');
    // null clears it
    const cleared = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { resolution: null },
    });
    expect(cleared.json().resolution).toBeNull();
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
      await app.inject({
        method: 'POST',
        url: `/projects/${other.projectKey}/sprints`,
        headers: { cookie },
        payload: { name: 'X' },
      })
    ).json().id;
    const foreignLabel = (
      await app.inject({
        method: 'POST',
        url: `/projects/${other.projectKey}/labels`,
        headers: { cookie },
        payload: { name: 'foreign' },
      })
    ).json().id;

    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/issues/GIRA-1',
          headers: { cookie },
          payload: { sprintId: foreignSprint },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/issues/GIRA-1',
          headers: { cookie },
          payload: { labelIds: [foreignLabel] },
        })
      ).statusCode,
    ).toBe(400);
  });

  it('rejects grafting another project’s sprint/label onto an issue (POST create)', async () => {
    const { user, cookie, projectKey } = await setup();
    const other = await seedProject({ reporterId: user.id, key: 'OTHR' });
    const foreignSprint = (
      await app.inject({
        method: 'POST',
        url: `/projects/${other.projectKey}/sprints`,
        headers: { cookie },
        payload: { name: 'X' },
      })
    ).json().id;
    const foreignLabel = (
      await app.inject({
        method: 'POST',
        url: `/projects/${other.projectKey}/labels`,
        headers: { cookie },
        payload: { name: 'foreign' },
      })
    ).json().id;

    // createIssue must mirror PATCH's cross-project guards, else a forged POST grafts.
    expect(
      (await create(app, cookie, { projectKey, title: 'graft', sprintId: foreignSprint }))
        .statusCode,
    ).toBe(400);
    expect(
      (await create(app, cookie, { projectKey, title: 'graft', labelIds: [foreignLabel] }))
        .statusCode,
    ).toBe(400);
  });

  it('requires a price for fixed-price billing (create schema + patch over merged state)', async () => {
    const { cookie, projectKey } = await setup();
    // create: fixed with no price is rejected by the create schema refine
    expect(
      (await create(app, cookie, { projectKey, title: 'fixed?', billingMode: 'fixed' })).statusCode,
    ).toBe(400);
    // create hourly, then PATCH to fixed without a price → rejected over the merged state
    await create(app, cookie, { projectKey, title: 'hourly' }); // GIRA-1
    const bad = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { billingMode: 'fixed' },
    });
    expect(bad.statusCode).toBe(400);
    // PATCH to fixed WITH a price persists
    const ok = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { billingMode: 'fixed', fixedPriceCents: 5000 },
    });
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

    await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { statusId: byName['In Progress']!.id },
    });
    const event = await prisma.outbox.findFirst({ where: { type: 'issue.status_changed' } });
    expect(event).not.toBeNull();
    expect((event!.payload as { issueKey: string }).issueKey).toBe('GIRA-1');

    // Clearing the due date sticks.
    const cleared = await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { dueAt: null },
    });
    expect(cleared.json().dueAt).toBeNull();
  });
});
