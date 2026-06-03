// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { resetDb } from './helpers/db.js';

describe('contracts CRUD (admin)', () => {
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

  async function makeClient(cookie: string, slug: string): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: { cookie },
      payload: { name: slug, slug, currency: 'EUR' },
    });
    return res.json().id as string;
  }

  it('creates, lists, reads, patches, and deletes a contract', async () => {
    const admin = await actingAs({ role: 'admin' });
    const clientId = await makeClient(admin.cookie, 'acme');

    const created = await app.inject({
      method: 'POST',
      url: '/contracts',
      headers: { cookie: admin.cookie },
      payload: {
        clientId,
        name: 'Retainer 2026',
        retainerCents: 500_000,
        includedHours: 40,
        status: 'active',
      },
    });
    expect(created.statusCode).toBe(201);
    const contract = created.json();
    expect(contract.name).toBe('Retainer 2026');
    expect(contract.retainerCents).toBe(500_000);
    expect(contract.includedHours).toBe(40);
    expect(contract.status).toBe('active');

    const list = await app.inject({
      method: 'GET',
      url: '/contracts',
      headers: { cookie: admin.cookie },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().map((c: { id: string }) => c.id)).toContain(contract.id);

    const filtered = await app.inject({
      method: 'GET',
      url: `/contracts?clientId=${clientId}`,
      headers: { cookie: admin.cookie },
    });
    expect(filtered.json()).toHaveLength(1);

    const one = await app.inject({
      method: 'GET',
      url: `/contracts/${contract.id}`,
      headers: { cookie: admin.cookie },
    });
    expect(one.statusCode).toBe(200);
    expect(one.json().name).toBe('Retainer 2026');

    const patched = await app.inject({
      method: 'PATCH',
      url: `/contracts/${contract.id}`,
      headers: { cookie: admin.cookie },
      payload: { status: 'ended', retainerCents: null },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().status).toBe('ended');
    expect(patched.json().retainerCents).toBeNull();

    const del = await app.inject({
      method: 'DELETE',
      url: `/contracts/${contract.id}`,
      headers: { cookie: admin.cookie },
    });
    expect(del.statusCode).toBe(204);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/contracts/${contract.id}`,
          headers: { cookie: admin.cookie },
        })
      ).statusCode,
    ).toBe(404);
  });

  it('404s for missing contract and a non-existent client on create', async () => {
    const admin = await actingAs({ role: 'admin' });
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/contracts/nope',
          headers: { cookie: admin.cookie },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/contracts/nope',
          headers: { cookie: admin.cookie },
          payload: { name: 'X' },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: '/contracts/nope',
          headers: { cookie: admin.cookie },
        })
      ).statusCode,
    ).toBe(404);
    // cuid-shaped but non-existent → passes schema validation, hits the notFound guard.
    const orphan = await app.inject({
      method: 'POST',
      url: '/contracts',
      headers: { cookie: admin.cookie },
      payload: { clientId: 'clnonexistent000000000000', name: 'Ghost' },
    });
    expect(orphan.statusCode).toBe(404);
  });

  it('is admin-only', async () => {
    const member = await actingAs({ role: 'member' });
    expect(
      (await app.inject({ method: 'GET', url: '/contracts', headers: { cookie: member.cookie } }))
        .statusCode,
    ).toBe(403);
  });

  it('blocks deleting a client that still has a contract', async () => {
    const admin = await actingAs({ role: 'admin' });
    const clientId = await makeClient(admin.cookie, 'beta');
    await app.inject({
      method: 'POST',
      url: '/contracts',
      headers: { cookie: admin.cookie },
      payload: { clientId, name: 'Active SOW' },
    });
    const del = await app.inject({
      method: 'DELETE',
      url: `/clients/${clientId}`,
      headers: { cookie: admin.cookie },
    });
    expect(del.statusCode).toBe(409);
    expect(del.json().error).toMatch(/contract/i);
  });
});
