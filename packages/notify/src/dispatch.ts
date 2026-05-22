// SPDX-License-Identifier: GPL-3.0-or-later
// Turn a domain event into delivered notifications. Used by scrumlord (draining
// the Outbox) and by the API (test-send).

import { type Prisma, prisma } from '@gira/db';
import { type Channel, deliver } from './deliver.js';

export interface DomainEvent {
  type: string;
  payload: Record<string, unknown>;
}

/** Channels that want this event type and whose scope matches the event's project. */
export async function resolveChannels(type: string, projectKey?: string) {
  const channels = await prisma.notificationChannel.findMany({
    where: { active: true, events: { has: type } },
  });
  let projectId: string | null = null;
  if (projectKey) {
    const project = await prisma.project.findUnique({
      where: { key: projectKey },
      select: { id: true },
    });
    projectId = project?.id ?? null;
  }
  return channels.filter(
    (c) => c.scope === 'global' || (c.scope === 'project' && c.projectId === projectId),
  );
}

/** One open incident per issue (deduped while open). */
export async function ensureIncident(issueKey: string) {
  const issue = await prisma.issue.findUnique({ where: { key: issueKey }, select: { id: true } });
  if (!issue) return null;
  const open = await prisma.incident.findFirst({ where: { issueId: issue.id, status: 'open' } });
  return open ?? prisma.incident.create({ data: { issueId: issue.id } });
}

export async function dispatchEvent(event: DomainEvent) {
  const projectKey =
    typeof event.payload.projectKey === 'string' ? event.payload.projectKey : undefined;
  const channels = await resolveChannels(event.type, projectKey);

  let incidentId: string | null = null;
  if (event.type === 'issue.emergency' && typeof event.payload.issueKey === 'string') {
    const incident = await ensureIncident(event.payload.issueKey);
    incidentId = incident?.id ?? null;
  }

  let delivered = 0;
  for (const ch of channels) {
    const notification = await prisma.notification.create({
      data: {
        type: event.type,
        channelId: ch.id,
        payload: event.payload as Prisma.InputJsonValue,
        incidentId,
        status: 'pending',
        attempts: 1,
      },
    });
    const result = await deliver(ch as Channel, { type: event.type, ...event.payload });
    await prisma.notification.update({
      where: { id: notification.id },
      data: result.ok
        ? { status: 'sent', sentAt: new Date() }
        : { status: 'failed', error: result.error?.slice(0, 500) },
    });
    if (result.ok) delivered += 1;
  }

  if (incidentId) {
    await prisma.incident.update({ where: { id: incidentId }, data: { lastNotifiedAt: new Date() } });
  }
  return { channelsMatched: channels.length, delivered, incidentId };
}

/** Drain unprocessed Outbox events. Each is marked processed so it isn't replayed. */
export async function dispatchOutboxBatch(limit = 100): Promise<number> {
  const events = await prisma.outbox.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  for (const e of events) {
    try {
      await dispatchEvent({ type: e.type, payload: (e.payload as Record<string, unknown>) ?? {} });
    } catch {
      // swallow per-event delivery errors; the Notification row records failures.
    }
    await prisma.outbox.update({ where: { id: e.id }, data: { processedAt: new Date() } });
  }
  return events.length;
}
