// SPDX-License-Identifier: GPL-3.0-or-later
// Server-side sessions. The cookie carries `${sessionId}.${secret}`; only the
// SHA-256 of the secret is stored, and it's compared in constant time. Sessions
// are revocable (logout) and expire.

import { prisma } from '@gira/db';
import { generateToken, hashToken, safeEqualHash } from '@gira/domain';
import type { UserView } from '@gira/shared';
import { config } from '../../config.js';
import { toUserView } from '../../lib/views.js';

export const SESSION_COOKIE = 'gira_session';

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.NODE_ENV === 'production',
    path: '/',
    maxAge: config.SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

export async function createSession(
  userId: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<{ cookieValue: string; expiresAt: Date }> {
  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_DAYS * 86_400_000);
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hash,
      expiresAt,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
    },
  });
  return { cookieValue: `${session.id}.${raw}`, expiresAt };
}

export async function resolveUserFromCookie(cookie?: string): Promise<UserView | null> {
  if (!cookie) return null;
  const dot = cookie.indexOf('.');
  if (dot < 1) return null;
  const id = cookie.slice(0, dot);
  const secret = cookie.slice(dot + 1);

  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (!safeEqualHash(hashToken(secret), session.tokenHash)) return null;
  if (!session.user.isActive) return null;

  return toUserView(session.user);
}

export async function revokeSessionFromCookie(cookie?: string): Promise<void> {
  if (!cookie) return;
  const dot = cookie.indexOf('.');
  if (dot < 1) return;
  const id = cookie.slice(0, dot);
  await prisma.session.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
}
