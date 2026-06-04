// SPDX-License-Identifier: GPL-3.0-or-later
// P1: lock/unlock a client's billing month. Locking freezes every worklog dated in that
// month against create/edit (enforced in the time routes via assertPeriodNotLocked).
import { type PeriodLock, Prisma, prisma } from '@gira/db';
import { createPeriodLockSchema, type PeriodLockView } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth, requireRole } from '../../lib/auth.js';
import { conflict, notFound } from '../../lib/http-error.js';

const adminOnly = { preHandler: [requireAuth, requireRole('admin')] };

function toPeriodLockView(l: PeriodLock): PeriodLockView {
  return {
    id: l.id,
    clientId: l.clientId,
    monthKey: l.monthKey,
    lockedById: l.lockedById,
    note: l.note,
    createdAt: l.createdAt.toISOString(),
  };
}

export async function periodLockRoutes(app: FastifyInstance): Promise<void> {
  app.get('/clients/:id/period-locks', adminOnly, async (req) => {
    const { id } = req.params as { id: string };
    const locks = await prisma.periodLock.findMany({
      where: { clientId: id },
      orderBy: { monthKey: 'desc' },
    });
    return locks.map(toPeriodLockView);
  });

  app.post('/clients/:id/period-locks', adminOnly, async (req, reply) => {
    const user = currentUser(req);
    const { id } = req.params as { id: string };
    const data = createPeriodLockSchema.parse(req.body);
    const client = await prisma.client.findUnique({ where: { id }, select: { id: true } });
    if (!client) throw notFound('client not found');
    try {
      const lock = await prisma.$transaction(async (tx) => {
        const l = await tx.periodLock.create({
          data: {
            clientId: id,
            monthKey: data.monthKey,
            lockedById: user.id,
            note: data.note ?? null,
          },
        });
        await recordAudit(tx, {
          actorId: user.id,
          action: 'periodLock.create',
          entityType: 'PeriodLock',
          entityId: l.id,
          after: { clientId: id, monthKey: l.monthKey },
        });
        return l;
      });
      return reply.code(201).send(toPeriodLockView(lock));
    } catch (err) {
      // The (clientId, monthKey) unique constraint makes locking an already-locked month
      // a clear conflict rather than a 500.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw conflict(`billing period ${data.monthKey} is already locked for this client`);
      }
      /* c8 ignore next -- defensive rethrow of an unexpected (non-P2002) DB error; only the
         P2002 conflict path is reachable from a well-formed request. Forcing a different
         failure requires spying prisma.$transaction, which corrupts the single-fork suite. */
      throw err;
    }
  });

  app.delete('/period-locks/:id', adminOnly, async (req, reply) => {
    const user = currentUser(req);
    const { id } = req.params as { id: string };
    await prisma.$transaction(async (tx) => {
      const before = await tx.periodLock.findUnique({ where: { id } });
      if (!before) throw notFound('period lock not found');
      await tx.periodLock.delete({ where: { id } });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'periodLock.delete',
        entityType: 'PeriodLock',
        entityId: id,
        before: { clientId: before.clientId, monthKey: before.monthKey },
      });
    });
    return reply.code(204).send();
  });
}
