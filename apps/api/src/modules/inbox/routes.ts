// SPDX-License-Identifier: GPL-3.0-or-later
// E1: the per-user in-app notification inbox. A user sees their OWN personal notifications
// (the userId-scoped Notification rows the dispatcher records) — in-app, not just by email
// — with read/unread. Scoped strictly to the caller; never another user's notifications.
import { type Notification, prisma } from '@gira/db';
import type { InboxItemView } from '@gira/shared';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { notFound } from '../../lib/http-error.js';

function toView(n: Notification): InboxItemView {
  return {
    id: n.id,
    type: n.type,
    payload: (n.payload as Record<string, unknown>) ?? {},
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt ? n.readAt.toISOString() : null,
  };
}

export async function inboxRoutes(app: FastifyInstance): Promise<void> {
  app.get('/inbox', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    const q = req.query as { unread?: string };
    const items = await prisma.notification.findMany({
      where: { userId: user.id, ...(q.unread === 'true' ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return items.map(toView);
  });

  app.get('/inbox/unread-count', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
    return { unread };
  });

  app.post('/inbox/:id/read', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    const { id } = req.params as { id: string };
    // Scope to the caller's own notification — a 404 (not 403) so it never reveals that
    // someone else's notification id exists.
    const n = await prisma.notification.findFirst({ where: { id, userId: user.id } });
    if (!n) throw notFound('notification not found');
    const updated = n.readAt
      ? n
      : await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    return toView(updated);
  });

  app.post('/inbox/read-all', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    const res = await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { marked: res.count };
  });
}
