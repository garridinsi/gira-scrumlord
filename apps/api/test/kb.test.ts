// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';

describe('KB / runbook (Q1, staff-only)', () => {
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

  it('creates org-wide + client-scoped articles, filters, reads, updates, deletes', async () => {
    const staff = await actingAs({ role: 'member' });
    const client = await prisma.client.create({
      data: { name: 'Acme', slug: 'acme', currency: 'EUR' },
    });

    const org = await app.inject({
      method: 'POST',
      url: '/kb',
      headers: { cookie: staff.cookie },
      payload: { title: 'On-call runbook', body: '# Steps\n1. Stay calm' },
    });
    expect(org.statusCode).toBe(201);
    expect(org.json().clientId).toBeNull();
    expect(org.json().createdById).toBe(staff.user.id);

    const scoped = await app.inject({
      method: 'POST',
      url: '/kb',
      headers: { cookie: staff.cookie },
      payload: { clientId: client.id, title: 'Acme quirks', body: 'they deploy on Fridays' },
    });
    expect(scoped.statusCode).toBe(201);

    // filter by client → only the scoped article
    const filtered = await app.inject({
      method: 'GET',
      url: `/kb?clientId=${client.id}`,
      headers: { cookie: staff.cookie },
    });
    expect(filtered.json().map((a: { title: string }) => a.title)).toEqual(['Acme quirks']);
    // unfiltered → both
    expect(
      (await app.inject({ method: 'GET', url: '/kb', headers: { cookie: staff.cookie } })).json(),
    ).toHaveLength(2);

    const id = scoped.json().id as string;
    const read = await app.inject({
      method: 'GET',
      url: `/kb/${id}`,
      headers: { cookie: staff.cookie },
    });
    expect(read.json().body).toMatch(/Fridays/);

    const patched = await app.inject({
      method: 'PATCH',
      url: `/kb/${id}`,
      headers: { cookie: staff.cookie },
      payload: { body: 'they deploy on Fridays — do NOT', clientId: null },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().clientId).toBeNull(); // re-scoped to org-wide
    expect(patched.json().body).toMatch(/do NOT/);

    expect(
      (await app.inject({ method: 'DELETE', url: `/kb/${id}`, headers: { cookie: staff.cookie } }))
        .statusCode,
    ).toBe(204);
    expect(
      (await app.inject({ method: 'GET', url: `/kb/${id}`, headers: { cookie: staff.cookie } }))
        .statusCode,
    ).toBe(404);
  });

  it('404s on a missing article and a non-existent client scope', async () => {
    const staff = await actingAs({ role: 'member' });
    expect(
      (await app.inject({ method: 'GET', url: '/kb/nope', headers: { cookie: staff.cookie } }))
        .statusCode,
    ).toBe(404);
    const orphan = await app.inject({
      method: 'POST',
      url: '/kb',
      headers: { cookie: staff.cookie },
      payload: { clientId: 'clnonexistent000000000000', title: 'x' },
    });
    expect(orphan.statusCode).toBe(404);
  });

  it('is staff-only — a client/portal user cannot reach the internal KB', async () => {
    const staff = await actingAs({ role: 'member' });
    await app.inject({
      method: 'POST',
      url: '/kb',
      headers: { cookie: staff.cookie },
      payload: { title: 'secret ops' },
    });
    const client = await prisma.client.create({ data: { name: 'C', slug: 'c', currency: 'EUR' } });
    const clientUser = await actingAs({ kind: 'client', role: 'viewer', clientId: client.id });
    expect(
      (await app.inject({ method: 'GET', url: '/kb', headers: { cookie: clientUser.cookie } }))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/kb',
          headers: { cookie: clientUser.cookie },
          payload: { title: 'x' },
        })
      ).statusCode,
    ).toBe(403);
  });
});
