// SPDX-License-Identifier: GPL-3.0-or-later
// In-app, read-only view of the audit log (the same rows sauron serves on :666).
// Admin-only; the standalone sauron daemon remains the canonical lore artifact.

import { type Prisma, prisma } from '@gira/db';
import type { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../../lib/auth.js';

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get('/audit', { preHandler: [requireAuth, requireRole('admin')] }, async (req) => {
    const q = req.query as {
      entityType?: string;
      entityId?: string;
      action?: string;
      limit?: string;
    };
    const limit = Math.min(Math.max(Number(q.limit ?? 60), 1), 200);
    const where: Prisma.AuditLogWhereInput = {};
    if (q.entityType) where.entityType = q.entityType;
    if (q.entityId) where.entityId = q.entityId;
    if (q.action) where.action = q.action;

    const entries = await prisma.auditLog.findMany({
      where,
      orderBy: { at: 'desc' },
      take: limit,
      include: { actor: { select: { id: true, name: true } } },
    });
    return { count: entries.length, entries };
  });
}
