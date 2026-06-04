// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for src/modules/board/routes.ts. These target branches the
// main board.test.ts does not reach: the end-of-column append path, the rank-collision
// resolution loop, the rebalance triggered through a beforeId-only drop, the
// foreign-status guard, and the reopen + sprint connect/disconnect arms of the move.
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('cov src/modules/board/routes.ts', () => {
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

  /** Seed a project owned by `user` with `n` issues created via the API (all in Backlog). */
  async function setup(n: number) {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey, byName } = await seedProject({ reporterId: user.id });
    for (let i = 0; i < n; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/issues',
        headers: { cookie },
        payload: { projectKey, title: `Issue ${i + 1}` },
      });
      expect(res.statusCode).toBe(201);
    }
    return { user, cookie, projectKey, byName };
  }

  const board = (cookie: string, key: string) =>
    app
      .inject({ method: 'GET', url: `/projects/${key}/board`, headers: { cookie } })
      .then(
        (r) =>
          r.json() as {
            columns: Array<{ status: { name: string }; issues: Array<{ key: string }> }>;
          },
      );

  const columnKeys = (
    b: { columns: Array<{ status: { name: string }; issues: Array<{ key: string }> }> },
    name: string,
  ) => b.columns.find((c) => c.status.name === name)!.issues.map((i) => i.key);

  it('appends to end of column when no drop neighbours are given (endOfColumn path)', async () => {
    // No beforeId/afterId -> beforeRank/afterRank both null -> placeInColumn reads the
    // column tail via endOfColumn() and ranks the card after it (covers the findFirst-desc
    // helper and the `?? null` tail). Move GIRA-1 with an empty payload: it should land last.
    const { cookie, projectKey } = await setup(3);
    const res = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/move',
      headers: { cookie },
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const b = await board(cookie, projectKey);
    expect(columnKeys(b, 'Backlog')).toEqual(['GIRA-2', 'GIRA-3', 'GIRA-1']);
  });

  it('resolves a rank collision by re-bracketing against the next sibling (clash loop)', async () => {
    // GIRA-1="2", GIRA-2="1". Drop GIRA-3 above GIRA-1 (afterId=GIRA-1): the first computed
    // rank rankBetween(null,"2")="1" clashes with GIRA-2, so the loop re-brackets against the
    // next sibling "2" -> rankBetween("1","2")="1i", a free slot. No rebalance.
    const { cookie, projectKey } = await setup(3);
    await prisma.issue.update({ where: { key: 'GIRA-1' }, data: { rank: '2' } });
    await prisma.issue.update({ where: { key: 'GIRA-2' }, data: { rank: '1' } });
    const res = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-3/move',
      headers: { cookie },
      payload: { afterId: 'GIRA-1' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().rank).toBe('1i');
    const b = await board(cookie, projectKey);
    // GIRA-2 ("1") < GIRA-3 ("1i") < GIRA-1 ("2")
    expect(columnKeys(b, 'Backlog')).toEqual(['GIRA-2', 'GIRA-3', 'GIRA-1']);
  });

  it('rebalances via a beforeId-only drop when the collision loop runs out of rank space', async () => {
    // Siblings: GIRA-1="z", GIRA-2="zi", GIRA-3="zi0". Move GIRA-4 with beforeId=GIRA-1 only.
    // beforeRank="z" -> rankBetween("z",null)="zi" clashes with GIRA-2; next sibling is "zi0"
    // (immediate neighbour) so rankBetween("zi","zi0") throws NoRankSpaceError -> the catch
    // arm falls through to a rebalance with afterKey unset, exercising the `else if (beforeKey)`
    // insertion-index branch. GIRA-4 is placed just after beforeId=GIRA-1.
    const { cookie, projectKey } = await setup(4);
    await prisma.issue.update({ where: { key: 'GIRA-1' }, data: { rank: 'z' } });
    await prisma.issue.update({ where: { key: 'GIRA-2' }, data: { rank: 'zi' } });
    await prisma.issue.update({ where: { key: 'GIRA-3' }, data: { rank: 'zi0' } });
    const res = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-4/move',
      headers: { cookie },
      payload: { beforeId: 'GIRA-1' },
    });
    expect(res.statusCode).toBe(200);
    const b = await board(cookie, projectKey);
    expect(columnKeys(b, 'Backlog')).toEqual(['GIRA-1', 'GIRA-4', 'GIRA-2', 'GIRA-3']);
  });

  it('rejects a statusId that belongs to another project', async () => {
    // Foreign status guard: a status from a different project must be refused with 400.
    const { cookie } = await setup(1);
    const { user: other } = await actingAs({ role: 'member' });
    const { byName: otherByName } = await seedProject({ reporterId: other.id, key: 'OTHER' });
    const foreignStatusId = otherByName['In Progress']!.id;
    const res = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/move',
      headers: { cookie },
      payload: { statusId: foreignStatusId },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('statusId does not belong to this project');
  });

  it('marks a reopen and connects a sprint when dragging a Done card back to Backlog', async () => {
    // First push GIRA-1 to Done so its current status category is `done`. Then drag it back to
    // Backlog WITH a sprintId: targetStatus.category !== 'done' -> reopened, bumping reopenCount,
    // clearing closedAt, connecting the sprint, and writing a `reopened` ledger entry.
    const { cookie, byName } = await setup(1);
    const projectId = byName.Backlog!.projectId;
    const sprint = await prisma.sprint.create({
      data: { projectId, name: 'S1' },
    });

    const toDone = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/move',
      headers: { cookie },
      payload: { statusId: byName.Done!.id },
    });
    expect(toDone.statusCode).toBe(200);
    expect(toDone.json().closedAt).not.toBeNull();

    const reopen = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/move',
      headers: { cookie },
      payload: { statusId: byName.Backlog!.id, sprintId: sprint.id },
    });
    expect(reopen.statusCode).toBe(200);
    const body = reopen.json();
    expect(body.reopenCount).toBe(1);
    expect(body.closedAt).toBeNull();
    expect(body.sprintId).toBe(sprint.id);

    const issue = await prisma.issue.findUnique({ where: { key: 'GIRA-1' }, select: { id: true } });
    const ledger = await prisma.issueEvent.findMany({
      where: { issueId: issue!.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(ledger.map((e) => e.kind)).toEqual(['created', 'status_changed', 'reopened']);
  });

  it('disconnects a sprint when sprintId is explicitly null', async () => {
    // The `'sprintId' in input` arm with a null value takes the disconnect branch.
    const { cookie, byName } = await setup(1);
    const projectId = byName.Backlog!.projectId;
    const sprint = await prisma.sprint.create({ data: { projectId, name: 'S1' } });
    await prisma.issue.update({ where: { key: 'GIRA-1' }, data: { sprintId: sprint.id } });

    const res = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/move',
      headers: { cookie },
      payload: { sprintId: null },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().sprintId).toBeNull();
  });
});
