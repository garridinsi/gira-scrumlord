// SPDX-License-Identifier: GPL-3.0-or-later
// Q1: internal runbook / KB. STAFF-ONLY — clients never see this (it's operational
// knowledge). Scoped to a client (per-client runbook) or org-wide (clientId null).
import { type KbArticle, prisma } from '@gira/db';
import { createKbArticleSchema, type KbArticleView, updateKbArticleSchema } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { notFound } from '../../lib/http-error.js';
import { assertStaff } from '../../lib/scope.js';

const staffOnly = { preHandler: requireAuth };

function toView(a: KbArticle): KbArticleView {
  return {
    id: a.id,
    clientId: a.clientId,
    title: a.title,
    body: a.body,
    createdById: a.createdById,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export async function kbRoutes(app: FastifyInstance): Promise<void> {
  app.get('/kb', staffOnly, async (req) => {
    assertStaff(currentUser(req));
    const q = req.query as { clientId?: string };
    const articles = await prisma.kbArticle.findMany({
      where: q.clientId ? { clientId: q.clientId } : {},
      orderBy: { updatedAt: 'desc' },
    });
    return articles.map(toView);
  });

  app.get('/kb/:id', staffOnly, async (req) => {
    assertStaff(currentUser(req));
    const { id } = req.params as { id: string };
    const a = await prisma.kbArticle.findUnique({ where: { id } });
    if (!a) throw notFound('article not found');
    return toView(a);
  });

  app.post('/kb', staffOnly, async (req, reply) => {
    const user = currentUser(req);
    assertStaff(user);
    const data = createKbArticleSchema.parse(req.body);
    if (data.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: data.clientId },
        select: { id: true },
      });
      if (!client) throw notFound('client not found');
    }
    const article = await prisma.$transaction(async (tx) => {
      const a = await tx.kbArticle.create({
        data: {
          clientId: data.clientId ?? null,
          title: data.title,
          body: data.body,
          createdById: user.id,
        },
      });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'kb.create',
        entityType: 'KbArticle',
        entityId: a.id,
        after: { title: a.title, clientId: a.clientId },
      });
      return a;
    });
    return reply.code(201).send(toView(article));
  });

  app.patch('/kb/:id', staffOnly, async (req) => {
    const user = currentUser(req);
    assertStaff(user);
    const { id } = req.params as { id: string };
    const data = updateKbArticleSchema.parse(req.body);
    const before = await prisma.kbArticle.findUnique({ where: { id } });
    if (!before) throw notFound('article not found');
    if (data.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: data.clientId },
        select: { id: true },
      });
      if (!client) throw notFound('client not found');
    }
    const updated = await prisma.$transaction(async (tx) => {
      const a = await tx.kbArticle.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.body !== undefined ? { body: data.body } : {}),
          ...('clientId' in data ? { clientId: data.clientId ?? null } : {}),
        },
      });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'kb.update',
        entityType: 'KbArticle',
        entityId: id,
        before: { title: before.title },
        after: { title: a.title },
      });
      return a;
    });
    return toView(updated);
  });

  app.delete('/kb/:id', staffOnly, async (req, reply) => {
    const user = currentUser(req);
    assertStaff(user);
    const { id } = req.params as { id: string };
    await prisma.$transaction(async (tx) => {
      const before = await tx.kbArticle.findUnique({ where: { id } });
      if (!before) throw notFound('article not found');
      await tx.kbArticle.delete({ where: { id } });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'kb.delete',
        entityType: 'KbArticle',
        entityId: id,
        before: { title: before.title },
      });
    });
    return reply.code(204).send();
  });
}
