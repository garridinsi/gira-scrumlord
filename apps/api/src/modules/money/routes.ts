// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';
import { upsertRateSchema } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { assertCanAccessProject, assertCanWrite } from '../../lib/scope.js';
import { loadIssueOr404 } from '../issues/service.js';
import { getProjectByKeyOr404 } from '../projects/service.js';
import { computeIssueCost, computeProjectMonthly, computeProjectSummary } from './service.js';

export async function moneyRoutes(app: FastifyInstance): Promise<void> {
  // Rate config is staff-only (clients never see how rates are set).
  app.get('/rates', { preHandler: requireAuth }, async (req) => {
    assertCanWrite(currentUser(req));
    return prisma.rate.findMany({ orderBy: { scope: 'asc' } });
  });

  app.post('/rates', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const input = upsertRateSchema.parse(req.body);
    const fields = { hourlyCents: input.hourlyCents, currency: input.currency };

    let rate;
    if (input.scope === 'default') {
      const existing = await prisma.rate.findFirst({ where: { scope: 'default' } });
      rate = existing
        ? await prisma.rate.update({ where: { id: existing.id }, data: fields })
        : await prisma.rate.create({ data: { scope: 'default', ...fields } });
    } else if (input.scope === 'client') {
      rate = await prisma.rate.upsert({
        where: { clientId: input.clientId! },
        create: { scope: 'client', clientId: input.clientId!, ...fields },
        update: fields,
      });
    } else if (input.scope === 'project') {
      rate = await prisma.rate.upsert({
        where: { projectId: input.projectId! },
        create: { scope: 'project', projectId: input.projectId!, ...fields },
        update: fields,
      });
    } else {
      rate = await prisma.rate.upsert({
        where: { issueId: input.issueId! },
        create: { scope: 'issue', issueId: input.issueId!, ...fields },
        update: fields,
      });
    }

    await recordAudit(prisma, {
      actorId: user.id,
      action: 'rate.upsert',
      entityType: 'Rate',
      entityId: rate.id,
      after: { scope: rate.scope, hourlyCents: rate.hourlyCents, currency: rate.currency },
    });
    return reply.code(201).send(rate);
  });

  app.delete('/rates/:id', { preHandler: requireAuth }, async (req, reply) => {
    assertCanWrite(currentUser(req));
    const { id } = req.params as { id: string };
    await prisma.rate.delete({ where: { id } });
    return reply.code(204).send();
  });

  // Cost + summary are visible to clients (scoped to their own project).
  app.get('/issues/:key/cost', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const issue = await loadIssueOr404(key);
    assertCanAccessProject(currentUser(req), { clientId: issue.project.clientId });
    return computeIssueCost(key);
  });

  app.get('/projects/:key/summary', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(currentUser(req), project);
    return computeProjectSummary(key);
  });

  // Per-calendar-month time + accrued cost (the maintenance/monthly lens).
  app.get('/projects/:key/monthly', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const { months } = req.query as { months?: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(currentUser(req), project);
    const n = Math.min(Math.max(Number(months) || 12, 1), 36);
    return computeProjectMonthly(key, n);
  });
}
