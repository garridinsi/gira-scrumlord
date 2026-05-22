// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';
import { createWorklogSchema, startTimerSchema } from '@gira/shared';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { conflict, notFound } from '../../lib/http-error.js';
import { assertCanAccessProject, assertCanWrite } from '../../lib/scope.js';
import { toTimerView, toWorklogView } from '../../lib/views.js';
import { loadIssueOr404 } from '../issues/service.js';

export async function timeRoutes(app: FastifyInstance): Promise<void> {
  // ── worklogs ──────────────────────────────────────────────────────────
  app.get('/issues/:key/worklogs', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const issue = await loadIssueOr404(key);
    assertCanAccessProject(currentUser(req), { clientId: issue.project.clientId });
    const logs = await prisma.worklog.findMany({
      where: { issueId: issue.id },
      include: { user: true },
      orderBy: { loggedAt: 'desc' },
    });
    return logs.map(toWorklogView);
  });

  app.post('/issues/:key/worklogs', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { key } = req.params as { key: string };
    const issue = await loadIssueOr404(key);
    assertCanAccessProject(user, { clientId: issue.project.clientId });
    const input = createWorklogSchema.parse(req.body);
    const worklog = await prisma.worklog.create({
      data: {
        issueId: issue.id,
        userId: user.id,
        minutes: input.minutes,
        note: input.note,
        billable: input.billable,
        loggedAt: input.loggedAt ?? new Date(),
      },
      include: { user: true },
    });
    return reply.code(201).send(toWorklogView(worklog));
  });

  // ── timers (one active per user) ───────────────────────────────────────
  app.get('/timers/active', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    const timer = await prisma.timer.findUnique({
      where: { userId: user.id },
      include: { issue: { select: { key: true } } },
    });
    return timer ? toTimerView(timer) : null;
  });

  app.post('/timers/start', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { issueKey } = startTimerSchema.parse(req.body);
    const issue = await loadIssueOr404(issueKey);
    assertCanAccessProject(user, { clientId: issue.project.clientId });

    const existing = await prisma.timer.findUnique({ where: { userId: user.id } });
    if (existing) throw conflict('a timer is already running; stop it first');

    const timer = await prisma.timer.create({
      data: { issueId: issue.id, userId: user.id },
      include: { issue: { select: { key: true } } },
    });
    return reply.code(201).send(toTimerView(timer));
  });

  app.post('/timers/stop', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const timer = await prisma.timer.findUnique({ where: { userId: user.id } });
    if (!timer) throw notFound('no active timer');

    const minutes = Math.max(1, Math.round((Date.now() - timer.startedAt.getTime()) / 60_000));
    const worklog = await prisma.$transaction(async (tx) => {
      const wl = await tx.worklog.create({
        data: {
          issueId: timer.issueId,
          userId: user.id,
          minutes,
          note: 'timer',
          billable: true,
          startedAt: timer.startedAt,
        },
        include: { user: true },
      });
      await tx.timer.delete({ where: { id: timer.id } });
      return wl;
    });
    return toWorklogView(worklog);
  });
}
