// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('sprints + backlog + velocity', () => {
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

  it('snapshots committed at start and completed at close', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey, byName } = await seedProject({ reporterId: user.id });

    const sprintRes = await app.inject({
      method: 'POST',
      url: `/projects/${projectKey}/sprints`,
      headers: { cookie },
      payload: { name: 'Sprint 1 — The Descent' },
    });
    const sprintId = sprintRes.json().id;

    // 3 issues in the sprint with points 5, 3, 8.
    for (const pts of [5, 3, 8]) {
      await app.inject({
        method: 'POST',
        url: '/issues',
        headers: { cookie },
        payload: { projectKey, title: `${pts}pt`, storyPoints: pts, sprintId },
      });
    }

    const start = await app.inject({
      method: 'POST',
      url: `/sprints/${sprintId}/start`,
      headers: { cookie },
    });
    expect(start.json().state).toBe('active');
    expect(start.json().committedPoints).toBe(16);
    expect(start.json().velocity.completedPoints).toBe(0);

    // Move the 5pt (GIRA-1) and 8pt (GIRA-3) issues to Done.
    for (const key of ['GIRA-1', 'GIRA-3']) {
      await app.inject({
        method: 'PATCH',
        url: `/issues/${key}`,
        headers: { cookie },
        payload: { statusId: byName.Done!.id },
      });
    }

    const close = await app.inject({
      method: 'POST',
      url: `/sprints/${sprintId}/close`,
      headers: { cookie },
    });
    expect(close.json().state).toBe('closed');
    expect(close.json().completedPoints).toBe(13);
    expect(close.json().committedPoints).toBe(16); // committed snapshot preserved
  });

  it('backlog returns only issues with no sprint', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const sprintId = (
      await app.inject({
        method: 'POST',
        url: `/projects/${projectKey}/sprints`,
        headers: { cookie },
        payload: { name: 'S' },
      })
    ).json().id;

    await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { cookie },
      payload: { projectKey, title: 'In sprint', sprintId },
    });
    await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { cookie },
      payload: { projectKey, title: 'In backlog' },
    });

    const backlog = await app.inject({
      method: 'GET',
      url: `/projects/${projectKey}/backlog`,
      headers: { cookie },
    });
    expect(backlog.json()).toHaveLength(1);
    expect(backlog.json()[0].title).toBe('In backlog');
  });

  it('refuses to re-start a sprint or run two active sprints in a project', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const mk = (name: string) =>
      app
        .inject({
          method: 'POST',
          url: `/projects/${projectKey}/sprints`,
          headers: { cookie },
          payload: { name },
        })
        .then((r) => r.json().id);
    const a = await mk('A');
    const b = await mk('B');

    expect(
      (await app.inject({ method: 'POST', url: `/sprints/${a}/start`, headers: { cookie } }))
        .statusCode,
    ).toBe(200);
    // can't re-start A (no longer future)
    expect(
      (await app.inject({ method: 'POST', url: `/sprints/${a}/start`, headers: { cookie } }))
        .statusCode,
    ).toBe(409);
    // can't start B while A is active
    expect(
      (await app.inject({ method: 'POST', url: `/sprints/${b}/start`, headers: { cookie } }))
        .statusCode,
    ).toBe(409);
  });

  it('lists, reads, patches, and deletes sprints', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const created = (
      await app.inject({
        method: 'POST',
        url: `/projects/${projectKey}/sprints`,
        headers: { cookie },
        payload: { name: 'S1', goal: 'ship it' },
      })
    ).json();

    const list = await app.inject({
      method: 'GET',
      url: `/projects/${projectKey}/sprints`,
      headers: { cookie },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().map((s: { id: string }) => s.id)).toContain(created.id);
    expect(list.json()[0].velocity).toBeTruthy(); // computeVelocity is mapped into the view

    const one = await app.inject({
      method: 'GET',
      url: `/sprints/${created.id}`,
      headers: { cookie },
    });
    expect(one.statusCode).toBe(200);
    expect(one.json().goal).toBe('ship it');

    const patched = await app.inject({
      method: 'PATCH',
      url: `/sprints/${created.id}`,
      headers: { cookie },
      payload: { name: 'S1 renamed', goal: 'new goal' },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().name).toBe('S1 renamed');

    const del = await app.inject({
      method: 'DELETE',
      url: `/sprints/${created.id}`,
      headers: { cookie },
    });
    expect(del.statusCode).toBe(204);
    expect(
      (await app.inject({ method: 'GET', url: `/sprints/${created.id}`, headers: { cookie } }))
        .statusCode,
    ).toBe(404);
  });

  it('returns unfinished issues to the backlog when a sprint closes', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey, byName } = await seedProject({ reporterId: user.id });
    const sprintId = (
      await app.inject({
        method: 'POST',
        url: `/projects/${projectKey}/sprints`,
        headers: { cookie },
        payload: { name: 'S' },
      })
    ).json().id;
    for (const t of ['done one', 'unfinished one']) {
      await app.inject({
        method: 'POST',
        url: '/issues',
        headers: { cookie },
        payload: { projectKey, title: t, sprintId },
      });
    }
    await app.inject({ method: 'POST', url: `/sprints/${sprintId}/start`, headers: { cookie } });
    await app.inject({
      method: 'PATCH',
      url: '/issues/GIRA-1',
      headers: { cookie },
      payload: { statusId: byName.Done!.id },
    });

    await app.inject({ method: 'POST', url: `/sprints/${sprintId}/close`, headers: { cookie } });

    // The unfinished GIRA-2 is back in the backlog; the done GIRA-1 stays put.
    const backlog = await app.inject({
      method: 'GET',
      url: `/projects/${projectKey}/backlog`,
      headers: { cookie },
    });
    expect(backlog.json().map((i: { key: string }) => i.key)).toEqual(['GIRA-2']);
  });
});
