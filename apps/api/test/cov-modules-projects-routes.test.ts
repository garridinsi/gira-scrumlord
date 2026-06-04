// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for src/modules/projects/routes.ts. These target arms the
// main projects.test.ts does not reach: the GET-by-key 404, the full DELETE
// /projects/:key happy path (delete + audit, 204), the status-create order default
// (both the max-order numeric arm and the empty-project `?? -1` fallback), and the
// DELETE /statuses/:id 404 arm inside the transaction.
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('cov src/modules/projects/routes.ts', () => {
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

  // line 44: GET /projects/:key when the key resolves to no project → notFound.
  it('GET /projects/:key 404s for an unknown key', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const res = await app.inject({
      method: 'GET',
      url: '/projects/NOPE',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/project not found/);
  });

  // lines 85–100: DELETE /projects/:key happy path — deletes the project, records the
  // audit, returns 204. Cascade removes the seeded default statuses.
  it('DELETE /projects/:key deletes the project and records an audit (204)', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id, key: 'DELP' });

    const res = await app.inject({
      method: 'DELETE',
      url: `/projects/${projectKey}`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(204);

    // The project is gone…
    expect(await prisma.project.findUnique({ where: { key: projectKey } })).toBeNull();
    // …and a project.delete audit row exists for the actor.
    const actions = (await prisma.auditLog.findMany({ where: { actorId: user.id } })).map(
      (a) => a.action,
    );
    expect(actions).toContain('project.delete');
  });

  // line 131 (numeric arm): POST statuses with no `order` on a project that already has
  // statuses → order = max._max.order + 1. Five defaults (max order 4) ⇒ new order 5.
  it('POST /projects/:key/statuses defaults order to max+1 when omitted', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id, key: 'STMX' });

    const res = await app.inject({
      method: 'POST',
      url: `/projects/${projectKey}/statuses`,
      headers: { cookie },
      payload: { name: 'QA', category: 'in_progress' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().order).toBe(5);
  });

  // line 131 (`?? -1` fallback): POST statuses with no `order` on a project that has no
  // statuses at all → aggregate _max.order is null, so order defaults to (-1)+1 = 0.
  it('POST /projects/:key/statuses defaults order to 0 on an empty project', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id, key: 'STEM' });
    const project = await prisma.project.findUniqueOrThrow({ where: { key: projectKey } });
    // Strip every status so the order aggregate returns null.
    await prisma.status.deleteMany({ where: { projectId: project.id } });

    const res = await app.inject({
      method: 'POST',
      url: `/projects/${projectKey}/statuses`,
      headers: { cookie },
      payload: { name: 'First', category: 'todo' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().order).toBe(0);
  });

  // line 152: DELETE /statuses/:id when the id matches no status → notFound inside the tx.
  it('DELETE /statuses/:id 404s for an unknown id', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const res = await app.inject({
      method: 'DELETE',
      url: '/statuses/cl00000000000000000000000',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/status not found/);
  });
});
