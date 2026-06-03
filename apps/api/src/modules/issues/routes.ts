// SPDX-License-Identifier: GPL-3.0-or-later
import { type Prisma, prisma } from '@gira/db';
import {
  createCommentSchema,
  createIssueSchema,
  issueFilterSchema,
  updateIssueSchema,
} from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { badRequest } from '../../lib/http-error.js';
import { assertCanAccessProject, assertCanWrite } from '../../lib/scope.js';
import { toCommentView, toIssueEventView, toIssueView } from '../../lib/views.js';
import { getProjectByKeyOr404 } from '../projects/service.js';
import {
  createIssue,
  emitEmergency,
  issueInclude,
  loadIssueOr404,
  recordIssueEvent,
} from './service.js';
import { computeSla } from './sla.js';

export async function issueRoutes(app: FastifyInstance): Promise<void> {
  // ── list / search / filter ─────────────────────────────────────────────
  app.get('/issues', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    const f = issueFilterSchema.parse(req.query);

    const projectWhere: Prisma.ProjectWhereInput = {};
    if (user.kind === 'client') projectWhere.clientId = user.clientId;
    if (f.projectKey) projectWhere.key = f.projectKey;

    const where: Prisma.IssueWhereInput = {};
    if (Object.keys(projectWhere).length) where.project = projectWhere;
    if (f.statusId) where.statusId = f.statusId;
    if (f.assigneeId) where.assigneeId = f.assigneeId;
    if (f.type) where.type = f.type;
    if (f.priority) where.priority = f.priority;
    if (f.sprintId) where.sprintId = f.sprintId;
    if (f.labelId) where.labels = { some: { id: f.labelId } };
    if (f.q) {
      where.OR = [
        { title: { contains: f.q, mode: 'insensitive' } },
        { description: { contains: f.q, mode: 'insensitive' } },
        { key: { contains: f.q.toUpperCase() } },
      ];
    }

    const issues = await prisma.issue.findMany({
      where,
      include: issueInclude,
      orderBy: { createdAt: 'desc' },
      take: f.limit,
    });
    return issues.map((i) => toIssueView(i));
  });

  // ── create ──────────────────────────────────────────────────────────────
  app.post('/issues', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const input = createIssueSchema.parse(req.body);
    const project = await getProjectByKeyOr404(input.projectKey);
    assertCanAccessProject(user, project);
    const issue = await createIssue(input, user.id);
    return reply.code(201).send(toIssueView(issue));
  });

  // ── read ──────────────────────────────────────────────────────────────
  app.get('/issues/:key', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const issue = await loadIssueOr404(key);
    assertCanAccessProject(currentUser(req), { clientId: issue.project.clientId });
    return toIssueView(issue);
  });

  // ── update ──────────────────────────────────────────────────────────────
  app.patch('/issues/:key', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { key } = req.params as { key: string };
    const before = await loadIssueOr404(key);
    assertCanAccessProject(user, { clientId: before.project.clientId });
    const input = updateIssueSchema.parse(req.body);

    // Moving across status categories drives closedAt; a done → not-done move is a reopen.
    let closedAt: Date | null | undefined;
    let reopened = false;
    let toCategory: string | null = null;
    if (input.statusId && input.statusId !== before.statusId) {
      const status = await prisma.status.findUnique({ where: { id: input.statusId } });
      if (!status || status.projectId !== before.projectId) throw badRequest('invalid statusId');
      closedAt = status.category === 'done' ? (before.closedAt ?? new Date()) : null;
      reopened = before.status.category === 'done' && status.category !== 'done';
      toCategory = status.category;
    }

    // Every connected entity must belong to this issue's project (and a client
    // assignee to this project's client) — otherwise you could graft another
    // client's sprint/parent/labels/assignee onto the issue.
    if (input.sprintId) {
      const s = await prisma.sprint.findUnique({
        where: { id: input.sprintId },
        select: { projectId: true },
      });
      if (!s || s.projectId !== before.projectId) throw badRequest('invalid sprintId');
    }
    if (input.parentId) {
      const p = await prisma.issue.findUnique({
        where: { id: input.parentId },
        select: { projectId: true },
      });
      if (!p || p.projectId !== before.projectId) throw badRequest('invalid parentId');
    }
    if (input.labelIds?.length) {
      const labels = await prisma.label.findMany({
        where: { id: { in: input.labelIds } },
        select: { projectId: true },
      });
      if (
        labels.length !== input.labelIds.length ||
        labels.some((l) => l.projectId !== before.projectId)
      ) {
        throw badRequest('invalid labelIds');
      }
    }
    if (input.assigneeId) {
      const a = await prisma.user.findUnique({
        where: { id: input.assigneeId },
        select: { isActive: true, kind: true, clientId: true },
      });
      if (!a || !a.isActive) throw badRequest('invalid assigneeId');
      if (a.kind === 'client' && a.clientId !== before.project.clientId)
        throw badRequest('invalid assigneeId');
    }

    // A fixed-price issue must carry a price. createIssue enforces this; mirror it
    // here over the MERGED state so a PATCH can't leave the issue fixed-with-null
    // (which only blows up later at invoice time).
    const effectiveMode = input.billingMode ?? before.billingMode;
    const effectivePrice =
      'fixedPriceCents' in input ? input.fixedPriceCents : before.fixedPriceCents;
    if (effectiveMode === 'fixed' && effectivePrice == null) {
      throw badRequest('fixedPriceCents is required when billingMode is fixed');
    }

    const data: Prisma.IssueUpdateInput = {
      title: input.title,
      description: input.description,
      type: input.type,
      priority: input.priority,
      storyPoints: input.storyPoints,
      estimateMinutes: input.estimateMinutes,
      billingMode: input.billingMode,
      fixedPriceCents: input.fixedPriceCents,
    };
    if ('resolution' in input) data.resolution = input.resolution ?? null;
    if ('blockedReason' in input) data.blockedReason = input.blockedReason ?? null;
    if ('severity' in input) data.severity = input.severity ?? null;
    if ('moscow' in input) data.moscow = input.moscow ?? null;
    if (reopened) data.reopenCount = { increment: 1 };
    if ('dueAt' in input) data.dueAt = input.dueAt ?? null;
    if (input.statusId) data.status = { connect: { id: input.statusId } };
    if (closedAt !== undefined) data.closedAt = closedAt;
    if ('assigneeId' in input) {
      data.assignee = input.assigneeId
        ? { connect: { id: input.assigneeId } }
        : { disconnect: true };
    }
    if ('sprintId' in input) {
      data.sprint = input.sprintId ? { connect: { id: input.sprintId } } : { disconnect: true };
    }
    if ('parentId' in input) {
      data.parent = input.parentId ? { connect: { id: input.parentId } } : { disconnect: true };
    }
    if (input.labelIds) data.labels = { set: input.labelIds.map((id) => ({ id })) };

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.issue.update({ where: { key }, data, include: issueInclude });
      if (u.priority === 'emergency' && before.priority !== 'emergency') {
        await emitEmergency(tx, u.key, before.project.key, u.title);
      }
      if (u.assigneeId && u.assigneeId !== before.assigneeId) {
        await tx.outbox.create({
          data: {
            type: 'issue.assigned',
            payload: {
              issueKey: u.key,
              projectKey: before.project.key,
              assigneeId: u.assigneeId,
              title: u.title,
              actorId: user.id,
            },
          },
        });
      }
      if (input.statusId && u.statusId !== before.statusId) {
        await tx.outbox.create({
          data: {
            type: 'issue.status_changed',
            payload: {
              issueKey: u.key,
              projectKey: before.project.key,
              title: u.title,
              fromStatusId: before.statusId,
              toStatusId: u.statusId,
              actorId: user.id,
            },
          },
        });
        // A1: append the transition to the issue's ledger (reopen = done → not-done).
        await recordIssueEvent(tx, {
          issueId: before.id,
          kind: reopened ? 'reopened' : 'status_changed',
          fromStatusId: before.statusId,
          toStatusId: u.statusId,
          statusCategory: toCategory,
          actorId: user.id,
        });
      }
      await recordAudit(tx, {
        actorId: user.id,
        action: 'issue.update',
        entityType: 'Issue',
        entityId: before.id,
        before: { title: before.title, statusId: before.statusId, priority: before.priority },
        after: { title: u.title, statusId: u.statusId, priority: u.priority },
      });
      return u;
    });
    return toIssueView(updated);
  });

  // ── delete ──────────────────────────────────────────────────────────────
  app.delete('/issues/:key', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { key } = req.params as { key: string };
    const issue = await loadIssueOr404(key);
    assertCanAccessProject(user, { clientId: issue.project.clientId });
    await prisma.$transaction(async (tx) => {
      await tx.issue.delete({ where: { key } });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'issue.delete',
        entityType: 'Issue',
        entityId: issue.id,
        before: { key: issue.key, title: issue.title },
      });
    });
    return reply.code(204).send();
  });

  // ── transition ledger (A1) ───────────────────────────────────────────────
  app.get('/issues/:key/events', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const issue = await loadIssueOr404(key);
    assertCanAccessProject(currentUser(req), { clientId: issue.project.clientId });
    const events = await prisma.issueEvent.findMany({
      where: { issueId: issue.id },
      orderBy: { createdAt: 'asc' },
    });
    return events.map(toIssueEventView);
  });

  // ── SLA status (B2) ───────────────────────────────────────────────────────
  app.get('/issues/:key/sla', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const issue = await loadIssueOr404(key);
    assertCanAccessProject(currentUser(req), { clientId: issue.project.clientId });
    return computeSla(key);
  });

  // ── comments ──────────────────────────────────────────────────────────
  app.get('/issues/:key/comments', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const issue = await loadIssueOr404(key);
    const user = currentUser(req);
    assertCanAccessProject(user, { clientId: issue.project.clientId });
    // N1 GUARD: a client/portal viewer NEVER receives internal comments. Staff see all.
    const comments = await prisma.comment.findMany({
      where: { issueId: issue.id, ...(user.kind === 'client' ? { visibility: 'client' } : {}) },
      include: { author: true },
      orderBy: { createdAt: 'asc' },
    });
    return comments.map(toCommentView);
  });

  app.post('/issues/:key/comments', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    const { key } = req.params as { key: string };
    const issue = await loadIssueOr404(key);
    // Anyone with access (including clients) may comment.
    assertCanAccessProject(user, { clientId: issue.project.clientId });
    const input = createCommentSchema.parse(req.body);
    // A client author can NEVER create an internal note — force 'client' server-side
    // regardless of the submitted value. Only staff may post internal notes.
    const visibility = user.kind === 'client' ? 'client' : input.visibility;
    const comment = await prisma.comment.create({
      data: { issueId: issue.id, authorId: user.id, body: input.body, visibility },
      include: { author: true },
    });
    return reply.code(201).send(toCommentView(comment));
  });
}
