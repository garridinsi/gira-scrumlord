// SPDX-License-Identifier: GPL-3.0-or-later
import { magicLinkCallbackSchema, magicLinkRequestSchema } from '@gira/shared';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../lib/auth.js';
import { toUserView } from '../../lib/views.js';
import { sendMagicLink } from './mailer.js';
import { consumeMagicLink, createMagicLink } from './service.js';
import {
  SESSION_COOKIE,
  createSession,
  revokeSessionFromCookie,
  sessionCookieOptions,
} from './session.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/magic-link', async (req, reply) => {
    const { email } = magicLinkRequestSchema.parse(req.body);
    const result = await createMagicLink(email);
    if (result.sent && result.link) {
      await sendMagicLink(email, result.link);
    }
    // Always 202 — never reveal whether the email maps to an account.
    return reply.code(202).send({ status: 'ok' });
  });

  app.post('/auth/callback', async (req, reply) => {
    const { token } = magicLinkCallbackSchema.parse(req.body);
    const user = await consumeMagicLink(token);
    const { cookieValue } = await createSession(user.id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    reply.setCookie(SESSION_COOKIE, cookieValue, sessionCookieOptions());
    return reply.send({ user: toUserView(user) });
  });

  app.post('/auth/logout', { preHandler: requireAuth }, async (req, reply) => {
    await revokeSessionFromCookie(req.cookies[SESSION_COOKIE]);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.code(204).send();
  });

  app.get('/auth/me', { preHandler: requireAuth }, async (req) => ({ user: req.user }));
}
