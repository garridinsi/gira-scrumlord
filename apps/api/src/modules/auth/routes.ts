// SPDX-License-Identifier: GPL-3.0-or-later
import { magicLinkCallbackSchema, magicLinkRequestSchema } from '@gira/shared';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../lib/auth.js';
import { authRateLimit } from '../../lib/rate-limits.js';
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
  app.post('/auth/magic-link', { config: { rateLimit: authRateLimit } }, async (req, reply) => {
    const { email } = magicLinkRequestSchema.parse(req.body);
    const result = await createMagicLink(email);
    if (result.sent && result.link) {
      // Never let a mail-delivery error (e.g. a transient SMTP 421) turn into a 500:
      // that would both break the no-enumeration guarantee (a failed send would look
      // different from a successful one) and surface infra errors to users. Log it
      // for ops and still return 202; the token is already persisted for retry.
      try {
        await sendMagicLink(email, result.link);
      } catch (err) {
        req.log.error({ err }, 'magic-link email send failed');
      }
    }
    // Always 202 — never reveal whether the email maps to an account.
    return reply.code(202).send({ status: 'ok' });
  });

  app.post('/auth/callback', { config: { rateLimit: authRateLimit } }, async (req, reply) => {
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
