// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage: src/modules/kb/routes.ts — the PATCH/DELETE arms the main kb.test.ts
// never reaches:
//   - line 83  : PATCH a missing article → notFound
//   - lines 84-90 : PATCH with a truthy data.clientId → client lookup + notFound when
//                   the client does not exist (89)
//   - lines 95-97 : PATCH carrying title + body + clientId → all three conditional
//                   spread arms in the update payload
//   - line 119 : DELETE a missing article → notFound (inside the tx)
import { prisma } from '@gira/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { resetDb } from './helpers/db.js';

// A syntactically valid CUID that has no matching Client row.
const MISSING_CLIENT_CUID = 'clnonexistent000000000000';

describe('cov src/modules/kb/routes.ts', () => {
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

  it('404s when patching a non-existent article (line 83)', async () => {
    const staff = await actingAs({ role: 'member' });
    const res = await app.inject({
      method: 'PATCH',
      url: '/kb/clmissingarticle00000000',
      headers: { cookie: staff.cookie },
      payload: { title: 'whatever' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('404s when patching with a clientId that has no client (lines 84-89)', async () => {
    const staff = await actingAs({ role: 'member' });
    const created = await app.inject({
      method: 'POST',
      url: '/kb',
      headers: { cookie: staff.cookie },
      payload: { title: 'On-call runbook', body: 'steps' },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;

    const res = await app.inject({
      method: 'PATCH',
      url: `/kb/${id}`,
      headers: { cookie: staff.cookie },
      payload: { clientId: MISSING_CLIENT_CUID },
    });
    expect(res.statusCode).toBe(404);
  });

  it('patches title + body + clientId together against a real client (lines 84-88, 95-97)', async () => {
    const staff = await actingAs({ role: 'member' });
    const client = await prisma.client.create({
      data: { name: 'Acme', slug: 'acme', currency: 'EUR' },
    });
    const created = await app.inject({
      method: 'POST',
      url: '/kb',
      headers: { cookie: staff.cookie },
      payload: { title: 'before', body: 'before body' },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;

    const res = await app.inject({
      method: 'PATCH',
      url: `/kb/${id}`,
      headers: { cookie: staff.cookie },
      // title (95) + body (96) + clientId scoped to a valid client (84-88, 97)
      payload: { title: 'after', body: 'after body', clientId: client.id },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { title: string; body: string; clientId: string | null };
    expect(body.title).toBe('after');
    expect(body.body).toBe('after body');
    expect(body.clientId).toBe(client.id);
  });

  it('404s when deleting a non-existent article (line 119)', async () => {
    const staff = await actingAs({ role: 'member' });
    const res = await app.inject({
      method: 'DELETE',
      url: '/kb/clmissingarticle00000000',
      headers: { cookie: staff.cookie },
    });
    expect(res.statusCode).toBe(404);
  });
});
