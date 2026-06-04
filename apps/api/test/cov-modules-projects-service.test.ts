// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { getProjectByKeyOr404 } from '../src/modules/projects/service.js';
import { actingAs } from './helpers/auth.js';
import { resetDb } from './helpers/db.js';

describe('cov src/modules/projects/service.ts', () => {
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

  // service.ts:46 — getProjectByKeyOr404 throws notFound when no project matches the key.
  // The /projects/:key/statuses route calls the service before any scope check, so a staff
  // member requesting a missing key reaches the not-found arm and surfaces a clean 404.
  it('returns 404 when the project key does not exist (service throws notFound)', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const res = await app.inject({
      method: 'GET',
      url: '/projects/MISSING/statuses',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/project not found/);
  });

  // Direct unit assertion on the same not-found arm: nothing is seeded, so the lookup
  // returns null and the function rejects with a 404 HttpError.
  it('getProjectByKeyOr404 rejects with a 404 for an unknown key', async () => {
    await expect(getProjectByKeyOr404('NOSUCHKEY')).rejects.toMatchObject({
      statusCode: 404,
      message: 'project not found',
    });
  });
});
