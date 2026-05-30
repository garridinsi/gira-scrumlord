// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs, cookieFor, makeUser } from './helpers/auth.js';
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

  // ── management (M6) ────────────────────────────────────────────────────────
  const post = (cookie: string, url: string, payload: object) =>
    app.inject({ method: 'POST', url, headers: { cookie }, payload });
  const patch = (cookie: string, url: string, payload: object) =>
    app.inject({ method: 'PATCH', url, headers: { cookie }, payload });

  it('admin onboards a teammate who can then sign in by email', async () => {
    const admin = await actingAs({ role: 'admin' });
    const res = await post(admin.cookie, '/users', {
      email: 'rex@example.test',
      name: 'Rex',
      kind: 'staff',
      role: 'member',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ email: 'rex@example.test', kind: 'staff', role: 'member', isActive: true });

    // The new user now exists with a magic-link identity → the login flow mints a token.
    const link = await app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'rex@example.test' },
    });
    expect(link.statusCode).toBe(202);
    expect(await prisma.magicLinkToken.findFirst({ where: { email: 'rex@example.test' } })).not.toBeNull();
  });

  it('creates a client user bound to a client, and rejects one without a client', async () => {
    const admin = await actingAs({ role: 'admin' });
    const client = await prisma.client.create({ data: { name: 'Acme', slug: 'acme' } });

    const ok = await post(admin.cookie, '/users', {
      email: 'wile@acme.test',
      name: 'Wile',
      kind: 'client',
      clientId: client.id,
    });
    expect(ok.statusCode).toBe(201);
    expect(ok.json()).toMatchObject({ kind: 'client', clientId: client.id });

    const bad = await post(admin.cookie, '/users', { email: 'orphan@acme.test', name: 'Orphan', kind: 'client' });
    expect(bad.statusCode).toBe(400);
  });

  it('rejects duplicate email and non-admin creators', async () => {
    const admin = await actingAs({ role: 'admin' });
    await post(admin.cookie, '/users', { email: 'dup@example.test', name: 'A' });
    expect((await post(admin.cookie, '/users', { email: 'dup@example.test', name: 'B' })).statusCode).toBe(409);

    const member = await actingAs({ role: 'member' });
    expect((await post(member.cookie, '/users', { email: 'x@example.test', name: 'X' })).statusCode).toBe(403);
  });

  it('changes roles but blocks self-demotion and removing the last admin', async () => {
    const admin = await actingAs({ role: 'admin' });
    const other = await makeUser({ role: 'member', name: 'Other' });

    expect((await patch(admin.cookie, `/users/${other.id}`, { role: 'admin' })).json().role).toBe('admin');
    expect((await patch(admin.cookie, `/users/${admin.user.id}`, { role: 'member' })).statusCode).toBe(400);
    // Two admins exist now, so demoting the other one is allowed.
    expect((await patch(admin.cookie, `/users/${other.id}`, { role: 'viewer' })).json().role).toBe('viewer');
  });

  it('deactivates a user; deactivated are hidden from the default list', async () => {
    const admin = await actingAs({ role: 'admin' });
    const victim = await makeUser({ role: 'member', name: 'Gone' });

    expect((await patch(admin.cookie, `/users/${victim.id}`, { isActive: false })).json().isActive).toBe(false);

    const def = await app.inject({ method: 'GET', url: '/users', headers: { cookie: admin.cookie } });
    expect(def.json().some((u: { id: string }) => u.id === victim.id)).toBe(false);
    const all = await app.inject({ method: 'GET', url: '/users?includeInactive=true', headers: { cookie: admin.cookie } });
    expect(all.json().some((u: { id: string }) => u.id === victim.id)).toBe(true);
  });

  it('invite mints a sign-in link for an active user', async () => {
    const admin = await actingAs({ role: 'admin' });
    const u = (await post(admin.cookie, '/users', { email: 'invitee@example.test', name: 'Inv' })).json();
    const res = await post(admin.cookie, `/users/${u.id}/invite`, {});
    expect(res.statusCode).toBe(200);
    expect(res.json().sent).toBe(true);
    expect(await prisma.magicLinkToken.findFirst({ where: { email: 'invitee@example.test' } })).not.toBeNull();
  });

  // ── security: client users are always read-only viewers ─────────────────────
  it('normalizes a client user to viewer even when member is requested', async () => {
    const admin = await actingAs({ role: 'admin' });
    const client = await prisma.client.create({ data: { name: 'Acme', slug: 'acme-norm' } });
    const created = await post(admin.cookie, '/users', {
      email: 'mallory@acme.test',
      name: 'Mallory',
      kind: 'client',
      role: 'member', // attempt to make a client a writer
      clientId: client.id,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().role).toBe('viewer'); // forced down

    // and a later promotion attempt is rejected
    const promote = await patch(admin.cookie, `/users/${created.json().id}`, { role: 'member' });
    expect(promote.statusCode).toBe(400);
  });

  it('denies a client user the staff write/config surface (cross-tenant guard)', async () => {
    const admin = await actingAs({ role: 'admin' });
    const client = await prisma.client.create({ data: { name: 'Acme', slug: 'acme-deny' } });
    const created = await post(admin.cookie, '/users', {
      email: 'wile@acme.test',
      name: 'Wile',
      kind: 'client',
      clientId: client.id,
    });
    const clientCookie = await cookieFor(created.json().id);

    // staff-only config surfaces must be 403 for a client, even though it's authed
    for (const url of ['/rates', '/channels', '/intake-sources']) {
      const r = await app.inject({ method: 'GET', url, headers: { cookie: clientCookie } });
      expect(r.statusCode).toBe(403);
    }
    // and a write to project config is refused
    const w = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie: clientCookie },
      payload: { key: 'NOPE', name: 'nope' },
    });
    expect(w.statusCode).toBe(403);
  });

  it('keeps kind↔clientId consistent on update', async () => {
    const admin = await actingAs({ role: 'admin' });
    const [a, b] = await Promise.all([
      prisma.client.create({ data: { name: 'A', slug: 'cid-a' } }),
      prisma.client.create({ data: { name: 'B', slug: 'cid-b' } }),
    ]);
    const clientUser = (
      await post(admin.cookie, '/users', { email: 'c@acme.test', name: 'C', kind: 'client', clientId: a.id })
    ).json();
    const staffUser = (await post(admin.cookie, '/users', { email: 's@acme.test', name: 'S' })).json();

    // A client user cannot be un-scoped or moved to another tenant.
    expect((await patch(admin.cookie, `/users/${clientUser.id}`, { clientId: null })).statusCode).toBe(400);
    expect((await patch(admin.cookie, `/users/${clientUser.id}`, { clientId: b.id })).statusCode).toBe(400);
    // A staff user cannot be scoped to a client.
    expect((await patch(admin.cookie, `/users/${staffUser.id}`, { clientId: a.id })).statusCode).toBe(400);
    // A no-op (same client) is fine.
    expect((await patch(admin.cookie, `/users/${clientUser.id}`, { clientId: a.id })).statusCode).toBe(200);
  });
});
