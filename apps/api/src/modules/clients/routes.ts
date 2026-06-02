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
    // The User/Project/Invoice → Client FKs are all RESTRICT (deleting a client must not
    // orphan portal users into a null clientId, nor detach projects out of tenant scope,
    // nor destroy non-fiscal annexes + their TicketBAI links). Pre-check each so the admin
    // gets a clear message instead of a raw FK violation — the FK is the DB backstop.
    const [userCount, projectCount, invoiceCount] = await Promise.all([
      prisma.user.count({ where: { clientId: id } }),
      prisma.project.count({ where: { clientId: id } }),
      prisma.invoice.count({ where: { clientId: id } }),
    ]);
    if (userCount > 0) {
      throw conflict(
        `this client still has ${userCount} user(s) — deactivate or reassign them before deleting`,
      );
    }
    if (projectCount > 0) {
      throw conflict(
        `this client still has ${projectCount} project(s) — reassign or delete them before deleting the client`,
      );
    }
    if (invoiceCount > 0) {
      throw conflict(
        `this client still has ${invoiceCount} billing annex(es) — these are financial records and must be kept; the client cannot be deleted`,
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
