// SPDX-License-Identifier: GPL-3.0-or-later
// Auth preHandlers. requireAuth resolves the session cookie to a user; requireRole
// gates by role. Compose them: { preHandler: [requireAuth, requireRole('admin')] }.

import type { UserView } from '@gira/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SESSION_COOKIE, resolveUserFromCookie } from '../modules/auth/session.js';
import { forbidden, unauthorized } from './http-error.js';

export type AuthUser = UserView;

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const user = await resolveUserFromCookie(req.cookies?.[SESSION_COOKIE]);
  if (!user) throw unauthorized();
  req.user = user;
}

export function currentUser(req: FastifyRequest): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}

export function requireRole(...roles: AuthUser['role'][]) {
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const u = currentUser(req);
    if (!roles.includes(u.role)) throw forbidden('insufficient role');
  };
}
