// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { requestEmailChange } from '../src/modules/auth/email-change.js';
import { createMagicLink } from '../src/modules/auth/service.js';
import { actingAs, cookieFor, makeUser } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';

describe('account self-service', () => {
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

  // ── PATCH /auth/me (profile) ───────────────────────────────────────────────
  describe('PATCH /auth/me', () => {
    it('lets a user edit their own name and locale', async () => {
      const { user, cookie } = await actingAs({ name: 'Old Name', role: 'member' });
      const res = await app.inject({
        method: 'PATCH',
        url: '/auth/me',
        headers: { cookie },
        payload: { name: 'New Name', locale: 'en' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().user).toMatchObject({ name: 'New Name', locale: 'en' });
      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row).toMatchObject({ name: 'New Name', locale: 'en' });
    });

    it('CANNOT be used to self-promote or change identity fields', async () => {
      const { user, cookie } = await actingAs({ role: 'member', kind: 'staff' });
      for (const payload of [
        { role: 'admin' },
        { kind: 'client' },
        { isActive: false },
        { clientId: 'x' },
        { email: 'evil@example.test' },
      ]) {
        const res = await app.inject({ method: 'PATCH', url: '/auth/me', headers: { cookie }, payload });
        expect(res.statusCode).toBe(400); // .strict() rejects unknown keys
      }
      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row).toMatchObject({ role: 'member', kind: 'staff', isActive: true, email: user.email });
    });

    it('requires authentication', async () => {
      const res = await app.inject({ method: 'PATCH', url: '/auth/me', payload: { name: 'x' } });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── active sessions ────────────────────────────────────────────────────────
  describe('sessions', () => {
    it('lists own sessions and flags the current one', async () => {
      const { user, cookie } = await actingAs();
      await cookieFor(user.id); // a second device/session
      const res = await app.inject({ method: 'GET', url: '/auth/sessions', headers: { cookie } });
      expect(res.statusCode).toBe(200);
      const sessions = res.json();
      expect(sessions.length).toBe(2);
      expect(sessions.filter((s: { current: boolean }) => s.current).length).toBe(1);
    });

    it('revoke-others kills every other session but keeps the current one', async () => {
      const { user, cookie } = await actingAs();
      const otherCookie = await cookieFor(user.id);
      const revoke = await app.inject({
        method: 'POST',
        url: '/auth/sessions/revoke-others',
        headers: { cookie },
      });
      expect(revoke.statusCode).toBe(200);
      expect(revoke.json().revoked).toBe(1);
      // current still works, other is dead
      expect((await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } })).statusCode).toBe(200);
      expect(
        (await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: otherCookie } })).statusCode,
      ).toBe(401);
    });
  });

  // ── verified email change ──────────────────────────────────────────────────
  describe('email change', () => {
    it('throttles rapid repeat change requests so a target address can’t be bombed (429)', async () => {
      const { cookie } = await actingAs({ email: 'me@example.test' });
      const first = await app.inject({
        method: 'POST',
        url: '/auth/email-change/request',
        headers: { cookie },
        payload: { newEmail: 'new1@example.test' },
      });
      expect(first.statusCode).toBe(202);
      const second = await app.inject({
        method: 'POST',
        url: '/auth/email-change/request',
        headers: { cookie },
        payload: { newEmail: 'new2@example.test' },
      });
      expect(second.statusCode).toBe(429); // cooldown — no second mail to a target
    });

    it('request rejects the same email and an already-taken email', async () => {
      const { user, cookie } = await actingAs({ email: 'me@example.test' });
      await makeUser({ email: 'taken@example.test' });

      const same = await app.inject({
        method: 'POST',
        url: '/auth/email-change/request',
        headers: { cookie },
        payload: { newEmail: 'me@example.test' },
      });
      expect(same.statusCode).toBe(400);

      const taken = await app.inject({
        method: 'POST',
        url: '/auth/email-change/request',
        headers: { cookie },
        payload: { newEmail: 'taken@example.test' },
      });
      expect(taken.statusCode).toBe(409);
      // nothing minted in either case
      expect(await prisma.emailChangeToken.count({ where: { userId: user.id } })).toBe(0);
    });

    it('is case-insensitive: a case variant of an existing email is rejected + stored lowercased', async () => {
      const { user, cookie } = await actingAs({ email: 'me@example.test' });
      await makeUser({ email: 'taken@example.test' });

      // A case variant of an existing address must NOT create a shadow account.
      const collide = await app.inject({
        method: 'POST',
        url: '/auth/email-change/request',
        headers: { cookie },
        payload: { newEmail: 'TAKEN@Example.test' },
      });
      expect(collide.statusCode).toBe(409);
      expect(await prisma.emailChangeToken.count({ where: { userId: user.id } })).toBe(0);

      // A fresh mixed-case address is normalized to lowercase before persisting.
      const ok = await app.inject({
        method: 'POST',
        url: '/auth/email-change/request',
        headers: { cookie },
        payload: { newEmail: 'New.Mixed@Example.TEST' },
      });
      expect(ok.statusCode).toBe(202);
      const tok = await prisma.emailChangeToken.findFirst({ where: { userId: user.id } });
      expect(tok?.newEmail).toBe('new.mixed@example.test');
    });

    it('request mints a single-use token to the new address (202)', async () => {
      const { user, cookie } = await actingAs({ email: 'me@example.test' });
      const res = await app.inject({
        method: 'POST',
        url: '/auth/email-change/request',
        headers: { cookie },
        payload: { newEmail: 'fresh@example.test' },
      });
      expect(res.statusCode).toBe(202);
      const tokens = await prisma.emailChangeToken.findMany({ where: { userId: user.id } });
      expect(tokens.length).toBe(1);
      expect(tokens[0]!.newEmail).toBe('fresh@example.test');
    });

    it('confirm switches email + identity, revokes sessions, and re-keys magic-link', async () => {
      const { user, cookie } = await actingAs({ email: 'old@example.test' });
      const { rawToken } = await requestEmailChange({ id: user.id, email: 'old@example.test' }, 'new@example.test');

      const res = await app.inject({
        method: 'POST',
        url: '/auth/email-change/confirm',
        payload: { token: rawToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().email).toBe('new@example.test');

      // user + magic-link identity now carry the new email
      const row = await prisma.user.findUnique({ where: { id: user.id }, include: { identities: true } });
      expect(row?.email).toBe('new@example.test');
      expect(row?.identities[0]).toMatchObject({ provider: 'magic-link', subject: 'new@example.test', email: 'new@example.test' });

      // every session was revoked → the old cookie no longer authenticates
      expect((await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } })).statusCode).toBe(401);

      // sign-in now works for the new email, not the old one
      expect((await createMagicLink('new@example.test')).sent).toBe(true);
      expect((await createMagicLink('old@example.test')).sent).toBe(false);
    });

    it('confirm rejects a reused or invalid token', async () => {
      const { user } = await actingAs({ email: 'a@example.test' });
      const { rawToken } = await requestEmailChange({ id: user.id, email: 'a@example.test' }, 'b@example.test');

      const first = await app.inject({ method: 'POST', url: '/auth/email-change/confirm', payload: { token: rawToken } });
      expect(first.statusCode).toBe(200);
      const second = await app.inject({ method: 'POST', url: '/auth/email-change/confirm', payload: { token: rawToken } });
      expect(second.statusCode).toBe(401);
      const bogus = await app.inject({ method: 'POST', url: '/auth/email-change/confirm', payload: { token: 'nope' } });
      expect(bogus.statusCode).toBe(401);
    });

    it('confirm refuses if the target email got taken in the meantime', async () => {
      const { user } = await actingAs({ email: 'race@example.test' });
      const { rawToken } = await requestEmailChange({ id: user.id, email: 'race@example.test' }, 'contested@example.test');
      // someone else grabs the target before confirm
      await makeUser({ email: 'contested@example.test' });
      const res = await app.inject({ method: 'POST', url: '/auth/email-change/confirm', payload: { token: rawToken } });
      expect(res.statusCode).toBe(409);
      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.email).toBe('race@example.test'); // unchanged
    });
  });

  // ── deactivation hardening ─────────────────────────────────────────────────
  describe('deactivation', () => {
    it('revokes a deactivated user’s sessions and reactivation needs a fresh login', async () => {
      const admin = await actingAs({ role: 'admin' });
      const target = await actingAs({ role: 'member' });

      // target is active and authenticated
      expect((await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: target.cookie } })).statusCode).toBe(200);

      const deact = await app.inject({
        method: 'PATCH',
        url: `/users/${target.user.id}`,
        headers: { cookie: admin.cookie },
        payload: { isActive: false },
      });
      expect(deact.statusCode).toBe(200);
      const row = await prisma.user.findUnique({ where: { id: target.user.id } });
      expect(row?.isActive).toBe(false);
      expect(row?.deactivatedAt).not.toBeNull();

      // their cookie is dead immediately
      expect((await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: target.cookie } })).statusCode).toBe(401);

      // reactivate — old sessions stay revoked (no silent resurrection)
      const react = await app.inject({
        method: 'PATCH',
        url: `/users/${target.user.id}`,
        headers: { cookie: admin.cookie },
        payload: { isActive: true },
      });
      expect(react.statusCode).toBe(200);
      expect((await prisma.user.findUnique({ where: { id: target.user.id } }))?.deactivatedAt).toBeNull();
      expect((await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: target.cookie } })).statusCode).toBe(401);
    });
  });
});
