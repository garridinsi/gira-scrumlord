// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing tests for src/modules/issues/service.ts. Surgical cases that hit the
// validation throws and `?? null` defensive arms the broad issues.test.ts suite skips.
import type { FastifyInstance } from 'fastify';
import type { CreateIssue } from '@gira/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createIssue, recordIssueEvent } from '../src/modules/issues/service.js';
import { actingAs, makeUser } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

// Build a fully-defaulted CreateIssue input (the route applies these via schema.parse;
// the direct unit calls below must supply them since they bypass the schema).
function makeInput(
  over: Partial<CreateIssue> & { projectKey: string; title: string },
): CreateIssue {
  return {
    description: '',
    type: 'task',
    priority: 'medium',
    billingMode: 'hourly',
    ...over,
  } as CreateIssue;
}

describe('cov src/modules/issues/service.ts', () => {
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

  // line 20: loadIssueOr404 throws notFound when the key matches nothing.
  it('GET /issues/:key 404s for an unknown key (line 20)', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const res = await app.inject({ method: 'GET', url: '/issues/NOPE-999', headers: { cookie } });
    expect(res.statusCode).toBe(404);
  });

  // lines 68–69: an explicit, valid statusId is accepted and used on create.
  it('create honours an explicit statusId that belongs to the project (lines 68–69)', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey, byName } = await seedProject({ reporterId: user.id });
    const res = await create(cookie, { projectKey, title: 'pinned', statusId: byName.Done!.id });
    expect(res.statusCode).toBe(201);
    expect(res.json().statusId).toBe(byName.Done!.id);
  });

  // lines 70–71: an explicit statusId from a DIFFERENT project is rejected.
  it("create rejects a statusId that doesn't belong to the project (lines 70–71)", async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const other = await seedProject({ reporterId: user.id, key: 'OTHR' });
    const foreignStatusId = other.byName.Done!.id;
    const res = await create(cookie, { projectKey, title: 'graft', statusId: foreignStatusId });
    expect(res.statusCode).toBe(400);
  });

  // line 86: an assigneeId that doesn't resolve to an active user is rejected.
  it('create rejects a non-existent assigneeId (line 86)', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const res = await create(cookie, {
      projectKey,
      title: 'who?',
      assigneeId: 'claaaaaaaaaaaaaaaaaaaaaaaa',
    });
    expect(res.statusCode).toBe(400);
  });

  it('create rejects an inactive assignee (line 86)', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const dev = await makeUser({ name: 'Gone', role: 'member' });
    await prisma.user.update({ where: { id: dev.id }, data: { isActive: false } });
    const res = await create(cookie, { projectKey, title: 'inactive', assigneeId: dev.id });
    expect(res.statusCode).toBe(400);
  });

  // lines 97–101: a valid parentId in the same project is accepted on create.
  it('create accepts a parentId in the same project (lines 97–101)', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    await create(cookie, { projectKey, title: 'parent' }); // GIRA-1
    const parent = await prisma.issue.findUnique({ where: { key: 'GIRA-1' } });
    const res = await create(cookie, { projectKey, title: 'child', parentId: parent!.id });
    expect(res.statusCode).toBe(201);
    expect(res.json().parentId).toBe(parent!.id);
  });

  // lines 102–103: a parentId from a different project is rejected.
  it("create rejects a parentId that doesn't belong to the project (lines 102–103)", async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const other = await seedProject({ reporterId: user.id, key: 'OTHR' });
    await create(cookie, { projectKey: other.projectKey, title: 'foreign parent' }); // OTHR-1
    const foreign = await prisma.issue.findUnique({ where: { key: 'OTHR-1' } });
    const res = await create(cookie, { projectKey, title: 'child', parentId: foreign!.id });
    expect(res.statusCode).toBe(400);
  });

  // line 65: createIssue throws notFound when the project key matches nothing. The route
  // pre-checks the project, so this guard is only reachable by calling the service directly.
  it('createIssue 404s for an unknown projectKey (line 65)', async () => {
    const reporter = await makeUser({ role: 'member' });
    await expect(
      createIssue(makeInput({ projectKey: 'GHOST', title: 'orphan' }), reporter.id),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  // line 74: createIssue throws badRequest when the project has zero statuses and no
  // explicit statusId. createProject always seeds statuses, so this guard is only
  // reachable by calling the service directly after stripping the columns.
  it('createIssue rejects a project that has no statuses (line 74)', async () => {
    const reporter = await makeUser({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: reporter.id });
    const project = await prisma.project.findUnique({ where: { key: projectKey } });
    await prisma.status.deleteMany({ where: { projectId: project!.id } });
    await expect(
      createIssue(makeInput({ projectKey, title: 'no columns' }), reporter.id),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  // lines 45–47: recordIssueEvent's `?? null` fallbacks for toStatusId / statusCategory /
  // actorId — every production caller passes these, so only a minimal call exercises them.
  it('recordIssueEvent defaults omitted fields to null (lines 45–47)', async () => {
    const reporter = await makeUser({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: reporter.id });
    const issue = await createIssue(makeInput({ projectKey, title: 'ledger' }), reporter.id);

    await prisma.$transaction(async (tx) => {
      await recordIssueEvent(tx, { issueId: issue.id, kind: 'status_changed' });
    });

    const ev = await prisma.issueEvent.findFirst({
      where: { issueId: issue.id, kind: 'status_changed' },
    });
    expect(ev).not.toBeNull();
    expect(ev!.fromStatusId).toBeNull();
    expect(ev!.toStatusId).toBeNull();
    expect(ev!.statusCategory).toBeNull();
    expect(ev!.actorId).toBeNull();
  });
});
