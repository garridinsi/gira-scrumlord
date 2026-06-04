// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage closure for src/modules/users/routes.ts. Each test targets a specific
// uncovered arm:
//   - line 47:  POST /users with kind:'client' and a well-formed but non-existent
//               clientId → the `client not found` 404 (zod's refine passes because the
//               id is present; only the DB lookup fails).
//   - line 82:  PATCH /users/:id for an id that doesn't exist → `user not found` 404.
//   - line 106: PATCH self with isActive:false → the self-deactivation 400.
//   - lines 164/165: POST /users/:id/invite for a missing user (404) and for a
//               deactivated user (400).
//   - lines 173/175/176: invite where sendMagicLink throws — the delivery failure is
//               logged and the route still 200s with emailed:false (never a 500).
// Lines 111 and 118 (the `last active admin` and PATCH `client not found` throws) are
// unreachable from any API call, so they carry c8-ignore in the source rather than a
// contrived test (see the comments there).
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import * as mailer from '../src/modules/auth/mailer.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';

describe('cov src/modules/users/routes.ts', () => {
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

  const post = (cookie: string, url: string, payload: object) =>
    app.inject({ method: 'POST', url, headers: { cookie }, payload });
  const patch = (cookie: string, url: string, payload: object) =>
    app.inject({ method: 'PATCH', url, headers: { cookie }, payload });

  it('404s creating a client user against a non-existent client (line 47)', async () => {
    const admin = await actingAs({ role: 'admin' });
    const res = await post(admin.cookie, '/users', {
      email: 'ghost@acme.test',
      name: 'Ghost',
      kind: 'client',
      clientId: 'cln_does_not_exist',
    });
    expect(res.statusCode).toBe(404);
  });

  it('404s patching a user that does not exist (line 82)', async () => {
    const admin = await actingAs({ role: 'admin' });
    const res = await patch(admin.cookie, '/users/usr_missing', { name: 'Nobody' });
    expect(res.statusCode).toBe(404);
  });

  it('blocks deactivating yourself (line 106)', async () => {
    const admin = await actingAs({ role: 'admin' });
    const res = await patch(admin.cookie, `/users/${admin.user.id}`, { isActive: false });
    expect(res.statusCode).toBe(400);
  });

  it('404s inviting a user that does not exist (line 164)', async () => {
    const admin = await actingAs({ role: 'admin' });
    const res = await post(admin.cookie, '/users/usr_missing/invite', {});
    expect(res.statusCode).toBe(404);
  });

  it('400s inviting a deactivated user (line 165)', async () => {
    const admin = await actingAs({ role: 'admin' });
    const victim = await prisma.user.create({
      data: {
        email: 'dead@example.test',
        name: 'Dead',
        kind: 'staff',
        role: 'member',
        isActive: false,
        identities: {
          create: {
            provider: 'magic-link',
            subject: 'dead@example.test',
            email: 'dead@example.test',
          },
        },
      },
    });
    const res = await post(admin.cookie, `/users/${victim.id}/invite`, {});
    expect(res.statusCode).toBe(400);
  });

  it('still 200s when the invite email send fails (lines 173/175/176)', async () => {
    const admin = await actingAs({ role: 'admin' });
    const u = (
      await post(admin.cookie, '/users', { email: 'invitee@example.test', name: 'Inv' })
    ).json() as { id: string };

    const spy = vi
      .spyOn(mailer, 'sendMagicLink')
      // Synchronous throw inside the mock (not mockRejectedValue) so vitest's
      // unhandled-rejection detector doesn't fail the test; the async wrapper still
      // rejects and the route's try/catch swallows it into a logged delivery failure.
      .mockImplementation(() => {
        throw new Error('SMTP 421 Try again later');
      });

    const res = await post(admin.cookie, `/users/${u.id}/invite`, {});

    expect(res.statusCode).toBe(200); // never a 500, even though the mailer threw
    expect(res.json()).toMatchObject({ sent: true, emailed: false });
    expect(spy).toHaveBeenCalledTimes(1);
    // The token was still persisted (mint happened before the failed send).
    expect(
      await prisma.magicLinkToken.findFirst({ where: { email: 'invitee@example.test' } }),
    ).not.toBeNull();

    spy.mockRestore();
  });
});
