// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';
import {
  createLabelSchema,
  createProjectSchema,
  createStatusSchema,
  updateProjectSchema,
  updateStatusSchema,
} from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { conflict, notFound } from '../../lib/http-error.js';
import { toLabelView, toStatusView } from '../../lib/views.js';
import { assertCanAccessProject, assertCanWrite, projectScopeWhere } from '../../lib/scope.js';
import { createProject, getProjectByKeyOr404 } from './service.js';

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  // ── projects ──────────────────────────────────────────────────────────
  app.get('/projects', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    const projects = await prisma.project.findMany({
      where: projectScopeWhere(user),
      orderBy: { key: 'asc' },
      include: { client: { select: { id: true, name: true, currency: true } } },
    });
    return projects;
  });

  app.post('/projects', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const input = createProjectSchema.parse(req.body);
    const project = await createProject(input, user.id);
    return reply.code(201).send(project);
  });

  app.get('/projects/:key', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const project = await prisma.project.findUnique({
      where: { key },
      include: { client: true, statuses: { orderBy: { order: 'asc' } }, labels: true },
    });
    if (!project) throw notFound('project not found');
    assertCanAccessProject(currentUser(req), project);
    return project;
  });

  app.patch('/projects/:key', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { key } = req.params as { key: string };
    const before = await getProjectByKeyOr404(key);
    assertCanAccessProject(user, before);
    const data = updateProjectSchema.parse(req.body);
    // Switching a sprints project to monthly while a sprint is still active/future
    // would strand that sprint (the monthly lens never surfaces sprints, and the
    // single-active-sprint guard later blocks reopening cleanly). Make the user close
    // it first rather than silently orphaning it.
    if (data.cadence && data.cadence !== 'sprints' && before.cadence === 'sprints') {
      const live = await prisma.sprint.count({
        where: { projectId: before.id, state: { in: ['active', 'future'] } },
      });
      if (live > 0) {
        throw conflict(
          'close or delete the active/future sprints before switching to monthly cadence',
        );
      }
    }
    return prisma.$transaction(async (tx) => {
      const after = await tx.project.update({ where: { key }, data });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'project.update',
        entityType: 'Project',
        entityId: before.id,
        before,
        after,
      });
      return after;
    });
  });

  app.delete('/projects/:key', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(user, project);
    await prisma.$transaction(async (tx) => {
      await tx.project.delete({ where: { key } });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'project.delete',
        entityType: 'Project',
        entityId: project.id,
        before: project,
      });
    });
    return reply.code(204).send();
  });

  // ── statuses ──────────────────────────────────────────────────────────
  app.get('/projects/:key/statuses', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(currentUser(req), project);
    const statuses = await prisma.status.findMany({
      where: { projectId: project.id },
      orderBy: { order: 'asc' },
    });
    return statuses.map(toStatusView);
  });

  app.post('/projects/:key/statuses', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(user, project);
    const input = createStatusSchema.parse(req.body);
    const max = await prisma.status.aggregate({
      where: { projectId: project.id },
      _max: { order: true },
    });
    const status = await prisma.status.create({
      data: {
        projectId: project.id,
        name: input.name,
        category: input.category,
        order: input.order ?? (max._max.order ?? -1) + 1,
      },
    });
    return reply.code(201).send(toStatusView(status));
  });

  app.patch('/statuses/:id', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    const data = updateStatusSchema.parse(req.body);
    const status = await prisma.status.update({ where: { id }, data });
    return toStatusView(status);
  });

  app.delete('/statuses/:id', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    await prisma.$transaction(async (tx) => {
      const before = await tx.status.findUnique({ where: { id } });
      if (!before) throw notFound('status not found');
      await tx.status.delete({ where: { id } });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'status.delete',
        entityType: 'Status',
        entityId: id,
        before: { name: before.name, category: before.category },
      });
    });
    return reply.code(204).send();
  });

  // ── labels ────────────────────────────────────────────────────────────
  app.get('/projects/:key/labels', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(currentUser(req), project);
    const labels = await prisma.label.findMany({ where: { projectId: project.id } });
    return labels.map(toLabelView);
  });

  app.post('/projects/:key/labels', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(user, project);
    const input = createLabelSchema.parse(req.body);
    const label = await prisma.label.create({ data: { projectId: project.id, ...input } });
    return reply.code(201).send(toLabelView(label));
  });

  app.delete('/labels/:id', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    await prisma.$transaction(async (tx) => {
      const before = await tx.label.findUnique({ where: { id } });
      if (!before) throw notFound('label not found');
      await tx.label.delete({ where: { id } });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'label.delete',
        entityType: 'Label',
        entityId: id,
        before: { name: before.name },
      });
    });
    return reply.code(204).send();
  });
}
