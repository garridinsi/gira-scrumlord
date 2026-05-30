// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';
import { createClientSchema, updateClientSchema } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth, requireRole } from '../../lib/auth.js';
import { conflict, notFound } from '../../lib/http-error.js';

const adminOnly = { preHandler: [requireAuth, requireRole('admin')] };

export async function clientRoutes(app: FastifyInstance): Promise<void> {
  app.get('/clients', adminOnly, async () => prisma.client.findMany({ orderBy: { name: 'asc' } }));

  app.post('/clients', adminOnly, async (req, reply) => {
    const data = createClientSchema.parse(req.body);
    const client = await prisma.$transaction(async (tx) => {
      const c = await tx.client.create({ data });
      await recordAudit(tx, {
        actorId: currentUser(req).id,
        action: 'client.create',
        entityType: 'Client',
        entityId: c.id,
        after: c,
      });
      return c;
    });
    return reply.code(201).send(client);
  });

  app.get('/clients/:id', adminOnly, async (req) => {
    const { id } = req.params as { id: string };
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw notFound('client not found');
    return client;
  });

  app.patch('/clients/:id', adminOnly, async (req) => {
    const { id } = req.params as { id: string };
    const data = updateClientSchema.parse(req.body);
    const before = await prisma.client.findUnique({ where: { id } });
    if (!before) throw notFound('client not found');
    return prisma.$transaction(async (tx) => {
      const after = await tx.client.update({ where: { id }, data });
      await recordAudit(tx, {
        actorId: currentUser(req).id,
        action: 'client.update',
        entityType: 'Client',
        entityId: id,
        before,
        after,
      });
      return after;
    });
  });

  app.delete('/clients/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    // The User→Client FK is RESTRICT (deleting a client must not orphan its portal
    // users into a null clientId, which would break tenant scoping). Pre-check so
    // the admin gets a clear message instead of a raw FK violation.
    const userCount = await prisma.user.count({ where: { clientId: id } });
    if (userCount > 0) {
      throw conflict(
        `this client still has ${userCount} user(s) — deactivate or reassign them before deleting`,
      );
    }
    await prisma.$transaction(async (tx) => {
      const before = await tx.client.delete({ where: { id } });
      await recordAudit(tx, {
        actorId: currentUser(req).id,
        action: 'client.delete',
        entityType: 'Client',
        entityId: id,
        before,
      });
    });
    return reply.code(204).send();
  });
}
