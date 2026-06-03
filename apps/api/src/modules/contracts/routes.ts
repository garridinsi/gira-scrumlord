// SPDX-License-Identifier: GPL-3.0-or-later
// R1: client contracts / SOWs (admin-only). Anchors retainer billing + SLA coverage.
import { type Contract, prisma } from '@gira/db';
import { createContractSchema, updateContractSchema, type ContractView } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth, requireRole } from '../../lib/auth.js';
import { notFound } from '../../lib/http-error.js';

const adminOnly = { preHandler: [requireAuth, requireRole('admin')] };

function toContractView(c: Contract): ContractView {
  return {
    id: c.id,
    clientId: c.clientId,
    name: c.name,
    retainerCents: c.retainerCents,
    includedHours: c.includedHours,
    startDate: c.startDate ? c.startDate.toISOString() : null,
    endDate: c.endDate ? c.endDate.toISOString() : null,
    status: c.status === 'ended' ? 'ended' : 'active',
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
  };
}

export async function contractRoutes(app: FastifyInstance): Promise<void> {
  app.get('/contracts', adminOnly, async (req) => {
    const q = req.query as { clientId?: string };
    const contracts = await prisma.contract.findMany({
      where: q.clientId ? { clientId: q.clientId } : {},
      orderBy: { createdAt: 'desc' },
    });
    return contracts.map(toContractView);
  });

  app.post('/contracts', adminOnly, async (req, reply) => {
    const user = currentUser(req);
    const data = createContractSchema.parse(req.body);
    const client = await prisma.client.findUnique({ where: { id: data.clientId }, select: { id: true } });
    if (!client) throw notFound('client not found');
    const contract = await prisma.$transaction(async (tx) => {
      const c = await tx.contract.create({
        data: {
          clientId: data.clientId,
          name: data.name,
          retainerCents: data.retainerCents ?? null,
          includedHours: data.includedHours ?? null,
          startDate: data.startDate ?? null,
          endDate: data.endDate ?? null,
          status: data.status,
          notes: data.notes ?? null,
        },
      });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'contract.create',
        entityType: 'Contract',
        entityId: c.id,
        after: { name: c.name, retainerCents: c.retainerCents },
      });
      return c;
    });
    return reply.code(201).send(toContractView(contract));
  });

  app.get('/contracts/:id', adminOnly, async (req) => {
    const { id } = req.params as { id: string };
    const c = await prisma.contract.findUnique({ where: { id } });
    if (!c) throw notFound('contract not found');
    return toContractView(c);
  });

  app.patch('/contracts/:id', adminOnly, async (req) => {
    const user = currentUser(req);
    const { id } = req.params as { id: string };
    const data = updateContractSchema.parse(req.body);
    const before = await prisma.contract.findUnique({ where: { id } });
    if (!before) throw notFound('contract not found');
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.contract.update({
        where: { id },
        data: {
          name: data.name,
          status: data.status,
          ...('retainerCents' in data ? { retainerCents: data.retainerCents ?? null } : {}),
          ...('includedHours' in data ? { includedHours: data.includedHours ?? null } : {}),
          ...('startDate' in data ? { startDate: data.startDate ?? null } : {}),
          ...('endDate' in data ? { endDate: data.endDate ?? null } : {}),
          ...('notes' in data ? { notes: data.notes ?? null } : {}),
        },
      });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'contract.update',
        entityType: 'Contract',
        entityId: id,
        before: { status: before.status, retainerCents: before.retainerCents },
        after: { status: u.status, retainerCents: u.retainerCents },
      });
      return u;
    });
    return toContractView(updated);
  });

  app.delete('/contracts/:id', adminOnly, async (req, reply) => {
    const user = currentUser(req);
    const { id } = req.params as { id: string };
    await prisma.$transaction(async (tx) => {
      const before = await tx.contract.findUnique({ where: { id } });
      if (!before) throw notFound('contract not found');
      await tx.contract.delete({ where: { id } });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'contract.delete',
        entityType: 'Contract',
        entityId: id,
        before: { name: before.name },
      });
    });
    return reply.code(204).send();
  });
}
