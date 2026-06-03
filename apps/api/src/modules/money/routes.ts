// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';
import { type UpsertRate, upsertRateSchema } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { badRequest, notFound } from '../../lib/http-error.js';
import { assertCanAccessProject, assertCanWrite, assertStaff } from '../../lib/scope.js';
import { loadIssueOr404 } from '../issues/service.js';
import { getProjectByKeyOr404 } from '../projects/service.js';
import { computeIssueCost, computeProjectMonthly, computeProjectSummary } from './service.js';

/**
 * The client currency a scoped rate must match, or null when there's no client
 * context (the `default` fallback rate, or a project with no client yet). A rate in
 * a different currency than its client would be billed as a foreign numeric value
 * under the client's currency label — so we reject it at save time too.
 */
async function clientCurrencyForRate(input: UpsertRate): Promise<string | null> {
  if (input.scope === 'client') {
    const c = await prisma.client.findUnique({
      where: { id: input.clientId! },
      select: { currency: true },
    });
    if (!c) throw notFound('client not found');
    return c.currency;
  }
  if (input.scope === 'project') {
    const p = await prisma.project.findUnique({
      where: { id: input.projectId! },
      select: { client: { select: { currency: true } } },
    });
    if (!p) throw notFound('project not found');
    return p.client?.currency ?? null;
  }
  if (input.scope === 'issue') {
    const i = await prisma.issue.findUnique({
      where: { id: input.issueId! },
      select: { project: { select: { client: { select: { currency: true } } } } },
    });
    if (!i) throw notFound('issue not found');
    return i.project.client?.currency ?? null;
  }
  return null; // default scope — the fallback rate, no client to match
}

export async function moneyRoutes(app: FastifyInstance): Promise<void> {
  // Rate config is staff-only. Read is open to any staff (incl. read-only viewers,
  // who already see derived cost); writes still require member/admin.
  app.get('/rates', { preHandler: requireAuth }, async (req) => {
    assertStaff(currentUser(req));
    return prisma.rate.findMany({ orderBy: { scope: 'asc' } });
  });

  app.post('/rates', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const input = upsertRateSchema.parse(req.body);
    const clientCurrency = await clientCurrencyForRate(input);
    if (clientCurrency && input.currency !== clientCurrency) {
      throw badRequest(
        `rate currency ${input.currency} must match the client currency ${clientCurrency}`,
      );
    }
    const fields = { hourlyCents: input.hourlyCents, currency: input.currency };

    let rate;
    if (input.scope === 'default') {
      // There's exactly one default-scope rate (the global fallback), enforced by the
      // Rate_one_default partial unique index. Prisma can't `upsert` on a partial index,
      // so: update if one exists, else create — and if a concurrent create wins the race
      // (P2002 on the index), fall back to updating the winner rather than 500-ing.
      const existing = await prisma.rate.findFirst({ where: { scope: 'default' } });
      if (existing) {
        rate = await prisma.rate.update({ where: { id: existing.id }, data: fields });
      } else {
        try {
          rate = await prisma.rate.create({ data: { scope: 'default', ...fields } });
        } catch (e) {
          if ((e as { code?: string }).code !== 'P2002') throw e;
          const winner = await prisma.rate.findFirstOrThrow({ where: { scope: 'default' } });
          rate = await prisma.rate.update({ where: { id: winner.id }, data: fields });
        }
      }
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
    const user = currentUser(req);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    await prisma.$transaction(async (tx) => {
      const before = await tx.rate.findUnique({ where: { id } });
      if (!before) throw notFound('rate not found');
      await tx.rate.delete({ where: { id } });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'rate.delete',
        entityType: 'Rate',
        entityId: id,
        before: { scope: before.scope, hourlyCents: before.hourlyCents, currency: before.currency },
      });
    });
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
