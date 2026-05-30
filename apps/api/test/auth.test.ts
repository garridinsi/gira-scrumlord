// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import * as mailer from '../src/modules/auth/mailer.js';
import { createMagicLink } from '../src/modules/auth/service.js';
import { SESSION_COOKIE } from '../src/modules/auth/session.js';
import { makeUser } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';

function sessionCookie(res: { cookies: Array<{ name: string; value: string }> }): string {
  const c = res.cookies.find((x) => x.name === SESSION_COOKIE);
  if (!c) throw new Error('no session cookie set');
  return `${SESSION_COOKIE}=${c.value}`;
}

describe('auth', () => {
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

  it('bootstraps the first user as admin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'boss@example.test' },
    });
    expect(res.statusCode).toBe(202);
    const user = await prisma.user.findUnique({ where: { email: 'boss@example.test' } });
    expect(user?.role).toBe('admin');
  });

  it('still returns 202 when the email send fails (resilient + no enumeration)', async () => {
    await makeUser({ email: 'boss@example.test', role: 'admin' }); // exists → a link is minted
    const spy = vi
      .spyOn(mailer, 'sendMagicLink')
      .mockRejectedValueOnce(new Error('SMTP 421 Try again later'));
    const res = await app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'boss@example.test' },
    });
    expect(res.statusCode).toBe(202); // never a 500, even though the mailer threw
    expect(spy).toHaveBeenCalledTimes(1);
    // the token is still persisted for retry
    expect(await prisma.magicLinkToken.count({ where: { email: 'boss@example.test' } })).toBe(1);
    spy.mockRestore();
  });

  it('does not mint a link or leak existence for unknown emails once users exist', async () => {
    await makeUser({ email: 'someone@example.test' });
    const result = await createMagicLink('ghost@example.test');
    expect(result.sent).toBe(false);
    const tokens = await prisma.magicLinkToken.count({ where: { email: 'ghost@example.test' } });
    expect(tokens).toBe(0);
    // Route still returns 202 (no enumeration).
    const res = await app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'ghost@example.test' },
    });
    expect(res.statusCode).toBe(202);
  });

  it('completes a full login → /auth/me → logout cycle', async () => {
    await makeUser({ email: 'rex@example.test', name: 'Rex' });
    const { rawToken } = await createMagicLink('rex@example.test');

    const cb = await app.inject({
      method: 'POST',
      url: '/auth/callback',
      payload: { token: rawToken },
    });
    expect(cb.statusCode).toBe(200);
    expect(cb.json().user).toMatchObject({ email: 'rex@example.test', name: 'Rex' });
    const cookie = sessionCookie(cb);

    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe('rex@example.test');

    const out = await app.inject({ method: 'POST', url: '/auth/logout', headers: { cookie } });
    expect(out.statusCode).toBe(204);

    const after = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
    expect(after.statusCode).toBe(401);
  });

  it('rejects an expired token', async () => {
    await makeUser({ email: 'rex@example.test' });
    const { rawToken } = await createMagicLink('rex@example.test');
    await prisma.magicLinkToken.updateMany({
      where: { email: 'rex@example.test' },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const cb = await app.inject({ method: 'POST', url: '/auth/callback', payload: { token: rawToken } });
    expect(cb.statusCode).toBe(401);
  });

  it('rejects a reused token', async () => {
    await makeUser({ email: 'rex@example.test' });
    const { rawToken } = await createMagicLink('rex@example.test');
    const first = await app.inject({ method: 'POST', url: '/auth/callback', payload: { token: rawToken } });
    expect(first.statusCode).toBe(200);
    const second = await app.inject({ method: 'POST', url: '/auth/callback', payload: { token: rawToken } });
    expect(second.statusCode).toBe(401);
  });

  it('returns 401 from /auth/me without a session', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});
