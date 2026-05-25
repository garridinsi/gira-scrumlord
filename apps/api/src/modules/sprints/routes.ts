// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';
import { velocity } from '@gira/domain';
import { createSprintSchema, updateSprintSchema } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { conflict } from '../../lib/http-error.js';
import { assertCanAccessProject, assertCanWrite } from '../../lib/scope.js';
import { toIssueView, toSprintView } from '../../lib/views.js';
import { issueInclude } from '../issues/service.js';
import { getProjectByKeyOr404 } from '../projects/service.js';
import { computeVelocity, loadSprintOr404 } from './service.js';

export async function sprintRoutes(app: FastifyInstance): Promise<void> {
  app.get('/projects/:key/sprints', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(currentUser(req), project);
    const sprints = await prisma.sprint.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      sprints.map(async (s) => toSprintView(s, await computeVelocity(s.id, s.committedPoints))),
    );
  });

  app.post('/projects/:key/sprints', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(user, project);
    const input = createSprintSchema.parse(req.body);
    const sprint = await prisma.$transaction(async (tx) => {
      const s = await tx.sprint.create({
        data: {
          projectId: project.id,
          name: input.name,
          goal: input.goal ?? null,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
        },
      });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'sprint.create',
        entityType: 'Sprint',
        entityId: s.id,
        after: { name: s.name },
      });
      return s;
    });
    return reply.code(201).send(toSprintView(sprint));
  });

  app.get('/projects/:key/backlog', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(currentUser(req), project);
    const issues = await prisma.issue.findMany({
      where: { projectId: project.id, sprintId: null },
      include: issueInclude,
      orderBy: { rank: 'asc' },
    });
    return issues.map((i) => toIssueView(i));
  });

  app.get('/sprints/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const sprint = await loadSprintOr404(id);
    assertCanAccessProject(currentUser(req), { clientId: sprint.project.clientId });
    return toSprintView(sprint, await computeVelocity(id, sprint.committedPoints));
  });

  app.patch('/sprints/:id', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    const sprint = await loadSprintOr404(id);
    assertCanAccessProject(user, { clientId: sprint.project.clientId });
    const input = updateSprintSchema.parse(req.body);
    const updated = await prisma.sprint.update({
      where: { id },
      data: {
        name: input.name,
        goal: input.goal,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });
    return toSprintView(updated, await computeVelocity(id, updated.committedPoints));
  });

  app.delete('/sprints/:id', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    const sprint = await loadSprintOr404(id);
    assertCanAccessProject(user, { clientId: sprint.project.clientId });
    await prisma.sprint.delete({ where: { id } }); // issues keep existing, sprintId set null
    return reply.code(204).send();
  });

  app.post('/sprints/:id/start', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    const sprint = await loadSprintOr404(id);
    assertCanAccessProject(user, { clientId: sprint.project.clientId });
    // Guard the committed-points snapshot: only a future sprint can be started, and
    // a project may have at most one active sprint at a time.
    if (sprint.state !== 'future') throw conflict('only a future sprint can be started');
    const alreadyActive = await prisma.sprint.findFirst({
      where: { projectId: sprint.projectId, state: 'active' },
      select: { id: true },
    });
    if (alreadyActive) throw conflict('this project already has an active sprint');
    const v = await computeVelocity(id);
    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.sprint.update({
        where: { id },
        data: {
          state: 'active',
          committedPoints: v.totalPoints,
          startDate: sprint.startDate ?? new Date(),
        },
      });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'sprint.start',
        entityType: 'Sprint',
        entityId: id,
        after: { committedPoints: s.committedPoints },
      });
      return s;
    });
    return toSprintView(updated, await computeVelocity(id, updated.committedPoints));
  });

  app.post('/sprints/:id/close', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    const sprint = await loadSprintOr404(id);
    assertCanAccessProject(user, { clientId: sprint.project.clientId });
    const result = await prisma.$transaction(async (tx) => {
      // Snapshot velocity atomically with the close so it can't drift, then return
      // unfinished issues to the backlog (else they're orphaned to a closed sprint
      // and vanish from both board and backlog).
      const issues = await tx.issue.findMany({
        where: { sprintId: id },
        include: { status: { select: { category: true } } },
      });
      const v = velocity(
        issues.map((i) => ({ storyPoints: i.storyPoints, statusCategory: i.status.category })),
        sprint.committedPoints,
      );
      await tx.issue.updateMany({
        where: { sprintId: id, status: { category: { not: 'done' } } },
        data: { sprintId: null },
      });
      const s = await tx.sprint.update({
        where: { id },
        data: { state: 'closed', completedPoints: v.completedPoints, endDate: sprint.endDate ?? new Date() },
      });
      await recordAudit(tx, {
        actorId: user.id,
        action: 'sprint.close',
        entityType: 'Sprint',
        entityId: id,
        after: { completedPoints: s.completedPoints, carriedOver: v.totalCount - v.completedCount },
      });
      return { s, v };
    });
    return toSprintView(result.s, result.v);
  });
}
