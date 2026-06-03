// SPDX-License-Identifier: GPL-3.0-or-later
// B2: per-project SLA policy config + project attainment. Policies are admin-only config;
// attainment is a staff metric.
import { type SlaPolicy, prisma } from '@gira/db';
import { type SlaPolicyView, upsertSlaPolicySchema } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth, requireRole } from '../../lib/auth.js';
import { notFound } from '../../lib/http-error.js';
import { assertCanAccessProject, assertStaff } from '../../lib/scope.js';
import { getProjectByKeyOr404 } from '../projects/service.js';
import { computeAttainment } from '../issues/sla.js';

const adminOnly = { preHandler: [requireAuth, requireRole('admin')] };

function toView(p: SlaPolicy): SlaPolicyView {
  return {
    id: p.id,
    projectId: p.projectId,
    priority: p.priority,
    responseMinutes: p.responseMinutes,
    resolutionMinutes: p.resolutionMinutes,
  };
}

export async function slaRoutes(app: FastifyInstance): Promise<void> {
  app.get('/projects/:key/sla-policies', adminOnly, async (req) => {
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    const policies = await prisma.slaPolicy.findMany({ where: { projectId: project.id } });
    return policies.map(toView);
  });

  app.put('/projects/:key/sla-policies', adminOnly, async (req) => {
    const user = currentUser(req);
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    const data = upsertSlaPolicySchema.parse(req.body);
    const priority = data.priority ?? null;
    // Upsert by (projectId, priority); findFirst handles the nullable-priority default,
    // which a compound unique can't dedupe in Postgres (NULLs are distinct).
    const existing = await prisma.slaPolicy.findFirst({
      where: { projectId: project.id, priority },
    });
    const saved = await prisma.$transaction(async (tx) => {
      const p = existing
        ? await tx.slaPolicy.update({
            where: { id: existing.id },
            data: {
              responseMinutes: data.responseMinutes,
              resolutionMinutes: data.resolutionMinutes,
            },
          })
        : await tx.slaPolicy.create({
            data: {
              projectId: project.id,
              priority,
              responseMinutes: data.responseMinutes,
              resolutionMinutes: data.resolutionMinutes,
            },
          });
      await recordAudit(tx, {
        actorId: user.id,
        action: existing ? 'slaPolicy.update' : 'slaPolicy.create',
        entityType: 'SlaPolicy',
        entityId: p.id,
        after: {
          priority,
          responseMinutes: p.responseMinutes,
          resolutionMinutes: p.resolutionMinutes,
        },
      });
      return p;
    });
    return toView(saved);
  });

  app.delete('/sla-policies/:id', adminOnly, async (req, reply) => {
    const user = currentUser(req);
    const { id } = req.params as { id: string };
    await prisma.$transaction(async (tx) => {
      const before = await tx.slaPolicy.findUnique({ where: { id } });
      if (!before) throw notFound('SLA policy not found');
      await tx.slaPolicy.delete({ where: { id } });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'slaPolicy.delete',
        entityType: 'SlaPolicy',
        entityId: id,
        before: { projectId: before.projectId, priority: before.priority },
      });
    });
    return reply.code(204).send();
  });

  app.get('/projects/:key/sla/attainment', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertStaff(user);
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(user, { clientId: project.clientId });
    return computeAttainment(project.id, project.key);
  });
}
