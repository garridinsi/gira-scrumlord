// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';
import {
  emailChangeConfirmSchema,
  emailChangeRequestSchema,
  magicLinkCallbackSchema,
  magicLinkRequestSchema,
  selfProfileSchema,
  type SessionView,
} from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { authRateLimit } from '../../lib/rate-limits.js';
import { toUserView } from '../../lib/views.js';
import { confirmEmailChange, requestEmailChange } from './email-change.js';
import { sendEmailChangeVerification, sendMagicLink } from './mailer.js';
import { consumeMagicLink, createMagicLink } from './service.js';
import {
  SESSION_COOKIE,
  createSession,
  revokeSessionFromCookie,
  revokeUserSessions,
  sessionCookieOptions,
  sessionIdFromCookie,
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
    // Stamp the successful sign-in so admins can tell active users from invited-but-
    // never-signed-in ones.
    const refreshed = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const { cookieValue } = await createSession(user.id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    reply.setCookie(SESSION_COOKIE, cookieValue, sessionCookieOptions());
    return reply.send({ user: toUserView(refreshed) });
  });

  app.post('/auth/logout', { preHandler: requireAuth }, async (req, reply) => {
    await revokeSessionFromCookie(req.cookies[SESSION_COOKIE]);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.code(204).send();
  });

  app.get('/auth/me', { preHandler: requireAuth }, async (req) => ({ user: req.user }));

  // Self-service profile edit. Strictly self-scoped and field-limited: the schema
  // only accepts name + locale, so this route can NEVER change role/kind/clientId/
  // isActive/email (privilege + identity fields). Email has its own verified flow.
  app.patch('/auth/me', { preHandler: requireAuth }, async (req) => {
    const me = currentUser(req);
    const data = selfProfileSchema.parse(req.body);
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id: me.id }, data });
      await recordAudit(tx, {
        actorId: me.id,
        action: 'user.update',
        entityType: 'User',
        entityId: me.id,
        before: { name: me.name, locale: me.locale },
        after: { name: u.name, locale: u.locale },
      });
      return u;
    });
    return { user: toUserView(updated) };
  });

  // ── verified email change ────────────────────────────────────────────────
  // Request: mint a token and email the link to the NEW address. Rate-limited like
  // the rest of the auth surface. Errors (same email / already taken) are returned
  // to the authenticated owner — this is their own account, not an enumeration oracle
  // for anonymous callers.
  app.post(
    '/auth/email-change/request',
    { preHandler: requireAuth, config: { rateLimit: authRateLimit } },
    async (req, reply) => {
      const me = currentUser(req);
      const { newEmail } = emailChangeRequestSchema.parse(req.body);
      const result = await requestEmailChange({ id: me.id, email: me.email }, newEmail);
      try {
        await sendEmailChangeVerification(result.newEmail, result.link);
      } catch (err) {
        req.log.error({ err }, 'email-change verification send failed');
      }
      return reply.code(202).send({ status: 'ok' });
    },
  );

  // Confirm: the token is the capability (no session required — the current session
  // is about to be revoked anyway). On success the email + identity switch and every
  // session is revoked, so the client must sign in again with the new address.
  app.post(
    '/auth/email-change/confirm',
    { config: { rateLimit: authRateLimit } },
    async (req, reply) => {
      const { token } = emailChangeConfirmSchema.parse(req.body);
      const user = await confirmEmailChange(token);
      reply.clearCookie(SESSION_COOKIE, { path: '/' });
      return { email: user.email };
    },
  );

  // ── active sessions (self) ───────────────────────────────────────────────
  app.get('/auth/sessions', { preHandler: requireAuth }, async (req) => {
    const me = currentUser(req);
    const currentId = sessionIdFromCookie(req.cookies[SESSION_COOKIE]);
    const sessions = await prisma.session.findMany({
      where: { userId: me.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    const views: SessionView[] = sessions.map((s) => ({
      id: s.id,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      lastSeenAt: s.lastSeenAt ? s.lastSeenAt.toISOString() : null,
      current: s.id === currentId,
    }));
    return views;
  });

  // Log out everywhere else — revoke every session except the current one.
  app.post('/auth/sessions/revoke-others', { preHandler: requireAuth }, async (req) => {
    const me = currentUser(req);
    const currentId = sessionIdFromCookie(req.cookies[SESSION_COOKIE]);
    // c8 ignore next -- defensive: requireAuth already parsed this same cookie, so currentId is never null here; the `?? undefined` arm is unreachable from an authenticated call
    const revoked = await revokeUserSessions(me.id, currentId ?? undefined);
    return { revoked };
  });
}
