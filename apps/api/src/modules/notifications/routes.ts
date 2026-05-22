// SPDX-License-Identifier: GPL-3.0-or-later
import { type Prisma, prisma } from '@gira/db';
import { deliver } from '@gira/notify';
import { createChannelSchema, incidentStatus, updateChannelSchema } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { notFound } from '../../lib/http-error.js';
import { assertCanAccessProject, assertCanWrite } from '../../lib/scope.js';
import { toChannelView, toIncidentView } from '../../lib/views.js';

const incidentInclude = {
  issue: { select: { key: true, title: true, project: { select: { key: true, clientId: true } } } },
} satisfies Prisma.IncidentInclude;

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  // ── channels (staff config) ─────────────────────────────────────────────
  app.get('/channels', { preHandler: requireAuth }, async (req) => {
    assertCanWrite(currentUser(req));
    const channels = await prisma.notificationChannel.findMany({ orderBy: { createdAt: 'desc' } });
    return channels.map(toChannelView);
  });

  app.post('/channels', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const input = createChannelSchema.parse(req.body);
    if (input.scope === 'project') {
      const project = await prisma.project.findUnique({ where: { id: input.projectId! } });
      if (!project) throw notFound('project not found');
      assertCanAccessProject(user, project);
    }
    const channel = await prisma.notificationChannel.create({
      data: {
        name: input.name,
        kind: input.kind,
        target: input.target,
        scope: input.scope,
        projectId: input.scope === 'project' ? input.projectId! : null,
        events: input.events,
      },
    });
    await recordAudit(prisma, {
      actorId: user.id,
      action: 'channel.create',
      entityType: 'NotificationChannel',
      entityId: channel.id,
      after: { name: channel.name, kind: channel.kind, events: channel.events },
    });
    return reply.code(201).send(toChannelView(channel));
  });

  app.patch('/channels/:id', { preHandler: requireAuth }, async (req) => {
    assertCanWrite(currentUser(req));
    const { id } = req.params as { id: string };
    const input = updateChannelSchema.parse(req.body);
    const channel = await prisma.notificationChannel.update({ where: { id }, data: input });
    return toChannelView(channel);
  });

  app.delete('/channels/:id', { preHandler: requireAuth }, async (req, reply) => {
    assertCanWrite(currentUser(req));
    const { id } = req.params as { id: string };
    await prisma.notificationChannel.delete({ where: { id } });
    return reply.code(204).send();
  });

  app.post('/channels/:id/test', { preHandler: requireAuth }, async (req) => {
    assertCanWrite(currentUser(req));
    const { id } = req.params as { id: string };
    const channel = await prisma.notificationChannel.findUnique({ where: { id } });
    if (!channel) throw notFound('channel not found');
    const result = await deliver(channel, {
      type: 'test',
      message: 'gira-scrumlord test notification 🌀',
      channel: channel.name,
    });
    await prisma.notification.create({
      data: {
        type: 'test',
        channelId: channel.id,
        payload: { message: 'test' },
        status: result.ok ? 'sent' : 'failed',
        attempts: 1,
        sentAt: result.ok ? new Date() : null,
        error: result.error?.slice(0, 500) ?? null,
      },
    });
    return result;
  });

  // ── incidents ───────────────────────────────────────────────────────────
  app.get('/incidents', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    const q = req.query as { status?: string };
    const where: Prisma.IncidentWhereInput = {};
    if (q.status) where.status = incidentStatus.parse(q.status);
    if (user.kind === 'client') where.issue = { project: { clientId: user.clientId } };
    const incidents = await prisma.incident.findMany({
      where,
      include: incidentInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return incidents.map(toIncidentView);
  });

  app.post('/incidents/:id/ack', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    const incident = await prisma.incident.findUnique({ where: { id }, include: incidentInclude });
    if (!incident) throw notFound('incident not found');
    assertCanAccessProject(user, { clientId: incident.issue.project.clientId });
    const updated = await prisma.incident.update({
      where: { id },
      data: { status: 'acked', acknowledgedById: user.id, acknowledgedAt: new Date() },
      include: incidentInclude,
    });
    await recordAudit(prisma, {
      actorId: user.id,
      action: 'incident.ack',
      entityType: 'Incident',
      entityId: id,
    });
    return toIncidentView(updated);
  });

  app.post('/incidents/:id/resolve', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    const incident = await prisma.incident.findUnique({ where: { id }, include: incidentInclude });
    if (!incident) throw notFound('incident not found');
    assertCanAccessProject(user, { clientId: incident.issue.project.clientId });
    const updated = await prisma.incident.update({
      where: { id },
      data: { status: 'resolved', resolvedAt: new Date() },
      include: incidentInclude,
    });
    await recordAudit(prisma, {
      actorId: user.id,
      action: 'incident.resolve',
      entityType: 'Incident',
      entityId: id,
    });
    return toIncidentView(updated);
  });
}
