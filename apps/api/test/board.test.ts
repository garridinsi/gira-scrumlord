// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('board + move', () => {
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
    for (const title of ['One', 'Two', 'Three']) {
      await app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload: { projectKey, title } });
    }
    return { cookie, projectKey, byName };
  }

  const board = (cookie: string, key: string) =>
    app.inject({ method: 'GET', url: `/projects/${key}/board`, headers: { cookie } }).then((r) => r.json());

  const columnKeys = (b: { columns: Array<{ status: { name: string }; issues: Array<{ key: string }> }> }, name: string) =>
    b.columns.find((c) => c.status.name === name)!.issues.map((i) => i.key);

  it('lists columns in order with issues sorted by rank', async () => {
    const { cookie, projectKey } = await setup();
    const b = await board(cookie, projectKey);
    expect(b.columns.map((c: { status: { name: string } }) => c.status.name)).toEqual([
      'Backlog',
      'To Do',
      'In Progress',
      'In Review',
      'Done',
    ]);
    expect(columnKeys(b, 'Backlog')).toEqual(['GIRA-1', 'GIRA-2', 'GIRA-3']);
  });

  it('reorders within a column via drop neighbours', async () => {
    const { cookie, projectKey } = await setup();
    // Drop GIRA-3 at the very top (above GIRA-1): afterId = GIRA-1, no beforeId.
    const res = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-3/move',
      headers: { cookie },
      payload: { afterId: 'GIRA-1' },
    });
    expect(res.statusCode).toBe(200);
    const b = await board(cookie, projectKey);
    expect(columnKeys(b, 'Backlog')).toEqual(['GIRA-3', 'GIRA-1', 'GIRA-2']);
  });

  it('keeps ranks distinct under concurrent moves onto the same gap (no collision)', async () => {
    const { cookie, projectKey } = await setup(); // GIRA-1, GIRA-2, GIRA-3 in Backlog
    // Two staff drop GIRA-2 and GIRA-3 into the SAME gap (above GIRA-1) at once.
    const [a, b] = await Promise.all([
      app.inject({ method: 'POST', url: '/issues/GIRA-2/move', headers: { cookie }, payload: { afterId: 'GIRA-1' } }),
      app.inject({ method: 'POST', url: '/issues/GIRA-3/move', headers: { cookie }, payload: { afterId: 'GIRA-1' } }),
    ]);
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
    // The serializable move guarantees the two new ranks never collide.
    expect(a.json().rank).not.toBe(b.json().rank);
    const board2 = await board(cookie, projectKey);
    const keys = columnKeys(board2, 'Backlog');
    expect([...keys].sort()).toEqual(['GIRA-1', 'GIRA-2', 'GIRA-3']); // none lost, ordering deterministic
  });

  it('rebalances and places correctly when neighbours admit no rank between them', async () => {
    const { cookie, projectKey } = await setup(); // GIRA-1/2/3 in Backlog
    // Force immediate-neighbour ranks: GIRA-1='m', GIRA-2='m0' (nothing fits between).
    await prisma.issue.update({ where: { key: 'GIRA-1' }, data: { rank: 'm' } });
    await prisma.issue.update({ where: { key: 'GIRA-2' }, data: { rank: 'm0' } });
    // Drop GIRA-3 between them: below GIRA-1 (beforeId) and above GIRA-2 (afterId).
    const res = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-3/move',
      headers: { cookie },
      payload: { beforeId: 'GIRA-1', afterId: 'GIRA-2' },
    });
    expect(res.statusCode).toBe(200);
    // The column was rebalanced; GIRA-3 sits between GIRA-1 and GIRA-2, order intact.
    const b = await board(cookie, projectKey);
    expect(columnKeys(b, 'Backlog')).toEqual(['GIRA-1', 'GIRA-3', 'GIRA-2']);
  });

  it('refuses to graft another project’s sprint via move', async () => {
    const { cookie } = await setup(); // project GIRA with GIRA-1..3
    // A second project with its own sprint.
    await seedProject({ reporterId: (await actingAs()).user.id, key: 'OTHER' });
    const sprintRes = await app.inject({
      method: 'POST',
      url: '/projects/OTHER/sprints',
      headers: { cookie },
      payload: { name: 'Foreign sprint' },
    });
    expect(sprintRes.statusCode).toBe(201);
    const foreignSprintId = sprintRes.json().id;

    const move = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/move',
      headers: { cookie },
      payload: { sprintId: foreignSprintId },
    });
    expect(move.statusCode).toBe(400); // invalid sprintId — not this project's sprint
  });

  it('moves across columns and sets closedAt when entering Done', async () => {
    const { cookie, projectKey, byName } = await setup();
    await app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/move',
      headers: { cookie },
      payload: { statusId: byName['In Progress']!.id },
    });
    const done = await app.inject({
      method: 'POST',
      url: '/issues/GIRA-2/move',
      headers: { cookie },
      payload: { statusId: byName.Done!.id },
    });
    expect(done.json().closedAt).not.toBeNull();

    const b = await board(cookie, projectKey);
    expect(columnKeys(b, 'In Progress')).toEqual(['GIRA-1']);
    expect(columnKeys(b, 'Done')).toEqual(['GIRA-2']);
    expect(columnKeys(b, 'Backlog')).toEqual(['GIRA-3']);
  });
});
