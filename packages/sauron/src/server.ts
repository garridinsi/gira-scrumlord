// SPDX-License-Identifier: GPL-3.0-or-later
// Sauron: a read-only window onto the audit log. It only watches. Don't touch.

import { type Prisma, prisma } from '@gira/db';
import Fastify, { type FastifyInstance } from 'fastify';

export function buildSauron(): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  // The eye does not act. Reject anything that would mutate.
  app.addHook('onRequest', async (req, reply) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      await reply.code(405).send({ error: 'the eye only watches' });
    }
  });

  app.get('/health', async () => ({ status: 'ok', eye: 'open', name: 'sauron' }));

  app.get('/audit', async (req) => {
    const q = req.query as Record<string, string | undefined>;
    const limit = Math.min(Math.max(Number(q.limit ?? 50) || 50, 1), 200);
    const where: Prisma.AuditLogWhereInput = {};
    if (q.entityType) where.entityType = q.entityType;
    if (q.entityId) where.entityId = q.entityId;
    if (q.actorId) where.actorId = q.actorId;
    if (q.action) where.action = q.action;
    const entries = await prisma.auditLog.findMany({
      where,
      orderBy: { at: 'desc' },
      take: limit,
    });
    return { count: entries.length, entries };
  });

  return app;
}
