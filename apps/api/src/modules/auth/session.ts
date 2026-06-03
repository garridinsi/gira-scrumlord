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
    secure: config.COOKIE_SECURE,
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

/** Extract the session id from the cookie value (`${sessionId}.${secret}`). */
export function sessionIdFromCookie(cookie?: string): string | null {
  if (!cookie) return null;
  const dot = cookie.indexOf('.');
  if (dot < 1) return null;
  return cookie.slice(0, dot);
}

// Only refresh `lastSeenAt` at most once per this window, so an authenticated user
// hammering the API doesn't generate a write on every request.
const LAST_SEEN_THROTTLE_MS = 5 * 60_000;

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

  // Throttled "last active" touch for the account → active-sessions screen.
  const now = Date.now();
  if (!session.lastSeenAt || now - session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
    await prisma.session
      .update({ where: { id }, data: { lastSeenAt: new Date(now) } })
      .catch(() => {});
  }

  return toUserView(session.user);
}

export async function revokeSessionFromCookie(cookie?: string): Promise<void> {
  const id = sessionIdFromCookie(cookie);
  if (!id) return;
  await prisma.session.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoke every live session for a user except (optionally) the one given. */
export async function revokeUserSessions(userId: string, exceptId?: string): Promise<number> {
  const res = await prisma.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
    data: { revokedAt: new Date() },
  });
  return res.count;
}
