// SPDX-License-Identifier: GPL-3.0-or-later
// User management. GET is for everyone (assignee pickers, scoped for clients).
// Create/edit/deactivate/invite are admin-only — this is how people are onboarded:
// an admin makes the account (+ a magic-link identity), then they sign in by email.

import { type Prisma, prisma } from '@gira/db';
import { createUserSchema, updateUserSchema } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth, requireRole } from '../../lib/auth.js';
import { badRequest, conflict, notFound } from '../../lib/http-error.js';
import { toUserView } from '../../lib/views.js';
import { sendMagicLink } from '../auth/mailer.js';
import { createMagicLink } from '../auth/service.js';

const adminOnly = { preHandler: [requireAuth, requireRole('admin')] };

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // Listing. Clients see only their own active people. Staff see active users for
  // pickers; an admin managing the team can include deactivated ones.
  app.get('/users', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    const { includeInactive } = req.query as { includeInactive?: string };
    const where: Prisma.UserWhereInput = {};
    if (user.kind === 'client') {
      where.clientId = user.clientId;
      where.isActive = true;
    } else if (!(user.role === 'admin' && includeInactive === 'true')) {
      where.isActive = true;
    }
    const users = await prisma.user.findMany({ where, orderBy: { name: 'asc' } });
    return users.map(toUserView);
  });

  // Onboard a person. Creates the user + a magic-link identity so they can sign in.
  app.post('/users', adminOnly, async (req, reply) => {
    const data = createUserSchema.parse(req.body);
    const actor = currentUser(req);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw conflict('a user with that email already exists');
    if (data.kind === 'client') {
      const client = await prisma.client.findUnique({
        where: { id: data.clientId },
        select: { id: true },
      });
      if (!client) throw notFound('client not found');
    }

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          kind: data.kind,
          role: data.role,
          clientId: data.kind === 'client' ? data.clientId : null,
          identities: {
            create: { provider: 'magic-link', subject: data.email, email: data.email },
          },
        },
      });
      await recordAudit(tx, {
        actorId: actor.id,
        action: 'user.create',
        entityType: 'User',
        entityId: u.id,
        after: { email: u.email, name: u.name, kind: u.kind, role: u.role, clientId: u.clientId },
      });
      return u;
    });
    return reply.code(201).send(toUserView(user));
  });

  // Edit role/name/active/client. Guards prevent locking everyone out.
  app.patch('/users/:id', adminOnly, async (req) => {
    const { id } = req.params as { id: string };
    const data = updateUserSchema.parse(req.body);
    const actor = currentUser(req);

    const before = await prisma.user.findUnique({ where: { id } });
    if (!before) throw notFound('user not found');

    // Security invariant: client users stay viewers — never promote one to a
    // writer role on the staff surface.
    if (before.kind === 'client' && data.role != null && data.role !== 'viewer') {
      throw badRequest('client users must be viewers');
    }
    // Invariant: kind ↔ clientId must stay consistent. A client user must keep a
    // (non-null) clientId and must not be silently moved to another tenant (which
    // would expose another client's portal to that user's existing sessions); a
    // staff user must never be scoped to a client. Email/kind are immutable here.
    if ('clientId' in data && data.clientId !== undefined) {
      if (before.kind === 'client' && data.clientId !== before.clientId) {
        throw badRequest('cannot move a client user to a different client');
      }
      if (before.kind === 'staff' && data.clientId !== null) {
        throw badRequest('staff users are not scoped to a client');
      }
    }

    const demotingFromAdmin = data.role != null && data.role !== 'admin' && before.role === 'admin';
    const deactivating = data.isActive === false;

    if (id === actor.id) {
      if (deactivating) throw badRequest('you cannot deactivate yourself');
      if (demotingFromAdmin) throw badRequest('you cannot remove your own admin role');
    }
    if (demotingFromAdmin || (deactivating && before.role === 'admin')) {
      const activeAdmins = await prisma.user.count({ where: { role: 'admin', isActive: true } });
      // c8 ignore next -- defensive: this route is adminOnly, so the acting admin is always counted among the active admins; demoting/deactivating any *other* admin leaves count >= 2, and the only way to drop to the last admin is acting on yourself, which is already rejected at lines 106-107 — so this <=1 throw is unreachable from an API call
      if (activeAdmins <= 1) throw badRequest('cannot remove the last active admin');
    }
    if (typeof data.clientId === 'string') {
      const client = await prisma.client.findUnique({
        where: { id: data.clientId },
        select: { id: true },
      });
      // c8 ignore next -- defensive: a string clientId only survives the guards above for a client user whose value equals before.clientId (line 94); a staff user is rejected at line 97. Since User.clientId is an FK with onDelete: Restrict, before.clientId always references a live client, so this lookup never misses and the throw is unreachable from an API call
      if (!client) throw notFound('client not found');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: {
          ...data,
          // Stamp/clear deactivatedAt alongside the flag so the row carries when it
          // happened, not just that it did.
          ...(data.isActive === false ? { deactivatedAt: new Date() } : {}),
          ...(data.isActive === true ? { deactivatedAt: null } : {}),
        },
      });
      // Deactivation must kill live sessions in the same transaction: otherwise a
      // stale cookie lingers until expiry, and a later reactivation would silently
      // resurrect those old sessions (they were only gated on isActive at resolve
      // time). Revoking here means reactivation always requires a fresh sign-in.
      if (data.isActive === false) {
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await recordAudit(tx, {
        actorId: actor.id,
        action: 'user.update',
        entityType: 'User',
        entityId: id,
        before: {
          name: before.name,
          role: before.role,
          isActive: before.isActive,
          clientId: before.clientId,
        },
        after: { name: u.name, role: u.role, isActive: u.isActive, clientId: u.clientId },
      });
      return u;
    });
    return toUserView(updated);
  });

  // Email an active user a fresh sign-in link (single-use, short-lived).
  app.post('/users/:id/invite', adminOnly, async (req) => {
    const { id } = req.params as { id: string };
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw notFound('user not found');
    if (!user.isActive) throw badRequest('cannot invite a deactivated user');

    const result = await createMagicLink(user.email);
    let emailed = false;
    if (result.sent && result.link) {
      try {
        await sendMagicLink(user.email, result.link);
        emailed = true;
      } catch (err) {
        // Token is persisted; report the delivery failure to the admin (not a 500).
        req.log.error({ err }, 'invite email send failed');
      }
    }
    return { sent: result.sent, emailed };
  });
}
