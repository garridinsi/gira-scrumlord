// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';
import { createWorklogSchema, startTimerSchema, updateWorklogSchema } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { conflict, forbidden, notFound } from '../../lib/http-error.js';
import { assertCanAccessProject, assertCanWrite, assertStaff } from '../../lib/scope.js';
import { toTimerView, toWorklogView } from '../../lib/views.js';
import { loadIssueOr404 } from '../issues/service.js';

export async function timeRoutes(app: FastifyInstance): Promise<void> {
  // ── worklogs ──────────────────────────────────────────────────────────
  // Staff-only: worklogs carry internal `note` free-text and staff identities that
  // were never meant for clients. Clients see accrued cost (a computed figure) via
  // the portal, never the raw worklog rows — so this list is gated to staff even for
  // the requester's own project.
  app.get('/issues/:key/worklogs', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    assertStaff(currentUser(req));
    const issue = await loadIssueOr404(key);
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

  // Edit/delete a worklog. Staff only (assertCanWrite), and only the logger or an
  // admin may touch it. A worklog already claimed by a FINALIZED annex (issued/paid/
  // void) is frozen — the annex must be voided first — so a billed figure can't be
  // mutated out from under a sent document. Draft-claimed worklogs are still editable
  // (the draft can be regenerated).
  async function loadEditableWorklog(id: string, user: ReturnType<typeof currentUser>) {
    const wl = await prisma.worklog.findUnique({
      where: { id },
      include: {
        invoice: { select: { status: true } },
        issue: { select: { key: true } },
      },
    });
    if (!wl) throw notFound('worklog not found');
    if (wl.userId !== user.id && user.role !== 'admin') {
      throw forbidden('only the logger or an admin can change this worklog');
    }
    if (wl.invoiceId) {
      // Lock-on-claim: once a worklog is attached to ANY annex it must not be mutated.
      // The annex freezes its subtotal + line minutes/amounts at generation and
      // issueInvoice only flips status (it does NOT recompute), so editing a claimed
      // worklog — even on a *draft* — silently desyncs the document from the hours and
      // a stale draft could be issued. To change billed hours: delete/regenerate the
      // draft (which frees the worklog via SetNull), or void a finalized annex first.
      throw conflict(
        wl.invoice && wl.invoice.status === 'draft'
          ? 'this worklog is on a draft annex — delete or regenerate the draft to edit it'
          : 'this worklog is billed on a finalized annex — void the annex first',
      );
    }
    return wl;
  }

  app.patch('/worklogs/:id', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    const input = updateWorklogSchema.parse(req.body);
    const before = await loadEditableWorklog(id, user);
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.worklog.update({ where: { id }, data: input, include: { user: true } });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'worklog.update',
        entityType: 'Worklog',
        entityId: id,
        before: { minutes: before.minutes, billable: before.billable, note: before.note },
        after: { minutes: u.minutes, billable: u.billable, note: u.note },
      });
      return u;
    });
    return toWorklogView(updated);
  });

  app.delete('/worklogs/:id', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    const before = await loadEditableWorklog(id, user);
    await prisma.$transaction(async (tx) => {
      await tx.worklog.delete({ where: { id } });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'worklog.delete',
        entityType: 'Worklog',
        entityId: id,
        before: { minutes: before.minutes, issueKey: before.issue.key },
      });
    });
    return reply.code(204).send();
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
