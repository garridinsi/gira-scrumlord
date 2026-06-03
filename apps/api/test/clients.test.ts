// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { resetDb } from './helpers/db.js';

describe('clients CRUD (admin)', () => {
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

  it('lists, reads, and patches a client; 404 on missing; member forbidden', async () => {
    const admin = await actingAs({ role: 'admin' });
    const created = (
      await app.inject({
        method: 'POST',
        url: '/clients',
        headers: { cookie: admin.cookie },
        payload: { name: 'Acme', slug: 'acme', currency: 'EUR' },
      })
    ).json();

    const list = await app.inject({
      method: 'GET',
      url: '/clients',
      headers: { cookie: admin.cookie },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().map((c: { slug: string }) => c.slug)).toContain('acme');

    const one = await app.inject({
      method: 'GET',
      url: `/clients/${created.id}`,
      headers: { cookie: admin.cookie },
    });
    expect(one.statusCode).toBe(200);
    expect(one.json().name).toBe('Acme');

    expect(
      (await app.inject({ method: 'GET', url: '/clients/nope', headers: { cookie: admin.cookie } }))
        .statusCode,
    ).toBe(404);

    const patched = await app.inject({
      method: 'PATCH',
      url: `/clients/${created.id}`,
      headers: { cookie: admin.cookie },
      payload: { name: 'Acme Renamed' },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().name).toBe('Acme Renamed');

    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/clients/nope',
          headers: { cookie: admin.cookie },
          payload: { name: 'X' },
        })
      ).statusCode,
    ).toBe(404);

    // The whole resource is admin-only.
    const member = await actingAs({ role: 'member' });
    expect(
      (await app.inject({ method: 'GET', url: '/clients', headers: { cookie: member.cookie } }))
        .statusCode,
    ).toBe(403);
  });
});
