// SPDX-License-Identifier: GPL-3.0-or-later
// Surgical coverage for src/modules/auth/session.ts: the cookie-parsing guards
// and the resolve/revoke null arms that the slice tests never reach.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createSession,
  resolveUserFromCookie,
  revokeSessionFromCookie,
  sessionIdFromCookie,
} from '../src/modules/auth/session.js';
import { makeUser } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';

describe('cov src/modules/auth/session.ts', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await resetDb();
  });

  it('sessionIdFromCookie returns null with no cookie (line 44)', () => {
    expect(sessionIdFromCookie()).toBeNull();
    expect(sessionIdFromCookie(undefined)).toBeNull();
  });

  it('sessionIdFromCookie returns null when there is no usable id before the dot (line 46)', () => {
    expect(sessionIdFromCookie('nodot')).toBeNull(); // indexOf('.') === -1
    expect(sessionIdFromCookie('.secret')).toBeNull(); // dot at index 0 → empty id
  });

  it('resolveUserFromCookie returns null when the id segment is empty (line 57)', async () => {
    expect(await resolveUserFromCookie('nodot')).toBeNull(); // indexOf('.') === -1
    expect(await resolveUserFromCookie('.secret')).toBeNull(); // dot at index 0
  });

  it('resolveUserFromCookie returns null when the secret does not match (line 63)', async () => {
    const user = await makeUser({ email: 'wrongsecret@example.test' });
    const { cookieValue } = await createSession(user.id);
    const id = sessionIdFromCookie(cookieValue)!;
    // Same valid session id, but a secret that hashes to something else.
    expect(await resolveUserFromCookie(`${id}.not-the-real-secret`)).toBeNull();
  });

  it('resolveUserFromCookie returns null for a deactivated user (line 64)', async () => {
    const user = await makeUser({ email: 'inactive@example.test' });
    const { cookieValue } = await createSession(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    // Correct id + secret, but the account is no longer active.
    expect(await resolveUserFromCookie(cookieValue)).toBeNull();
  });

  it('revokeSessionFromCookie is a no-op when the cookie has no id (line 79)', async () => {
    await expect(revokeSessionFromCookie('nodot')).resolves.toBeUndefined();
    await expect(revokeSessionFromCookie(undefined)).resolves.toBeUndefined();
  });
});
