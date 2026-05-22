// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs, makeUser } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';

describe('users', () => {
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

  it('staff see all active users', async () => {
    const { cookie } = await actingAs({ role: 'member', name: 'Staffer' });
    await makeUser({ name: 'Another' });
    const res = await app.inject({ method: 'GET', url: '/users', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBe(2);
  });

  it('client users only see their own client’s people', async () => {
    const clientA = await prisma.client.create({ data: { name: 'A', slug: 'a' } });
    const clientB = await prisma.client.create({ data: { name: 'B', slug: 'b' } });
    await makeUser({ kind: 'client', role: 'viewer', clientId: clientB.id, name: 'B person' });
    const a = await actingAs({ kind: 'client', role: 'viewer', clientId: clientA.id, name: 'A person' });

    const res = await app.inject({ method: 'GET', url: '/users', headers: { cookie: a.cookie } });
    expect(res.json().map((u: { name: string }) => u.name)).toEqual(['A person']);
  });
});
