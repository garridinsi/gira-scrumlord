// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage closure for src/modules/intake/routes.ts:
//   - lines 23,26,27,28: parseGeneric — the body-normalisation block, including the
//     `externalRef` string true-arm (line 28), reached by POSTing a generic-kind webhook
//     whose payload carries title/description/externalRef.
//   - line 45: POST /intake-sources with a well-formed but non-existent projectId →
//     `notFound('project not found')`. The id must satisfy the Zod `.cuid()` check so the
//     request reaches the route's findUnique guard instead of being rejected at parse time.
//   - line 126: DELETE /assignment-rules/:id for an id that does not exist →
//     `notFound('assignment rule not found')` (the :id param has no schema, so any
//     cuid-shaped string reaches the in-transaction guard).
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

// A cuid-shaped placeholder that passes `z.string().cuid()` yet never exists in the DB.
const MISSING_CUID = 'clnonexistent000000000000';

describe('cov src/modules/intake/routes.ts', () => {
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

  it('parseGeneric normalises title/description/externalRef from a generic webhook (lines 23,26,27,28)', async () => {
    const { user, cookie } = await actingAs({ role: 'admin' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const project = await prisma.project.findUnique({ where: { key: projectKey } });
    const created = await app.inject({
      method: 'POST',
      url: '/intake-sources',
      headers: { cookie },
      payload: { name: 'generic', kind: 'generic', projectId: project!.id },
    });
    expect(created.statusCode).toBe(201);
    const { id: sourceId, token } = created.json() as { id: string; token: string };

    // externalRef as a string exercises the true arm of the line-28 ternary.
    const res = await app.inject({
      method: 'POST',
      url: `/intake/${sourceId}`,
      headers: { 'x-gira-token': token },
      payload: { title: 'Generic with ref', description: 'a body', externalRef: 'ext-123' },
    });
    expect(res.statusCode).toBe(202);
    expect((res.json().results as Array<{ action: string }>)[0]!.action).toBe('created');

    const issue = await prisma.issue.findFirst({ where: { externalRef: 'ext-123' } });
    expect(issue?.title).toBe('Generic with ref');
    expect(issue?.description).toBe('a body');
  });

  it('rejects creating an intake source for a non-existent project (line 45)', async () => {
    const { cookie } = await actingAs({ role: 'admin' });
    const res = await app.inject({
      method: 'POST',
      url: '/intake-sources',
      headers: { cookie },
      payload: { name: 'orphan', kind: 'generic', projectId: MISSING_CUID },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('project not found');
  });

  it('404s when deleting an assignment rule that does not exist (line 126)', async () => {
    const { cookie } = await actingAs({ role: 'admin' });
    const res = await app.inject({
      method: 'DELETE',
      url: `/assignment-rules/${MISSING_CUID}`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('assignment rule not found');
  });
});
