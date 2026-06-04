// SPDX-License-Identifier: GPL-3.0-or-later
// Turn a domain event into delivered notifications. Used by scrumlord (draining
// the Outbox) and by the API (test-send).

import { type Prisma, prisma } from '@gira/db';
import { type Channel, deliver, sendUserEmail } from './deliver.js';

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

const asString = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/**
 * Personal emails (distinct from admin-configured channels): the assignee hears
 * when an issue lands on them; the reporter + assignee hear when its status moves.
 * The actor who made the change is never emailed about their own action.
 */
async function sendPersonal(
  outboxId: string | null | undefined,
  recipient: { id: string; email: string },
  subject: string,
  body: string,
  event: DomainEvent,
): Promise<number> {
  // Idempotent under re-dispatch: skip if this user was already successfully notified for
  // this outbox event. A failed/never-sent delivery is retried (at-least-once for paging,
  // without duplicating successes).
  if (outboxId) {
    const already = await prisma.notification.findFirst({
      where: { outboxId, userId: recipient.id, status: 'sent' },
      select: { id: true },
    });
    if (already) return 0;
  }
  const notification = await prisma.notification.create({
    data: {
      type: event.type,
      channelId: null,
      userId: recipient.id,
      outboxId: outboxId ?? null,
      payload: event.payload as Prisma.InputJsonValue,
      status: 'pending',
      attempts: 1,
    },
  });
  const r = await sendUserEmail(recipient.email, subject, body);
  await prisma.notification.update({
    where: { id: notification.id },
    data: r.ok
      ? { status: 'sent', sentAt: new Date() }
      : { status: 'failed', error: r.error?.slice(0, 500) },
  });
  return r.ok ? 1 : 0;
}

export async function deliverPersonal(
  event: DomainEvent,
  outboxId?: string | null,
): Promise<number> {
  const actorId = asString(event.payload.actorId);

  if (event.type === 'issue.assigned') {
    const assigneeId = asString(event.payload.assigneeId);
    if (!assigneeId || assigneeId === actorId) return 0;
    const u = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { email: true, isActive: true },
    });
    if (!u?.isActive) return 0;
    const key = asString(event.payload.issueKey) ?? 'an issue';
    const title = asString(event.payload.title) ?? '';
    return sendPersonal(
      outboxId,
      { id: assigneeId, email: u.email },
      `Te asignaron · Assigned to you: ${key}`,
      `${key} — ${title}\n\nSe te ha asignado esta incidencia · You've been assigned this issue.`,
      event,
    );
  }

  if (event.type === 'issue.status_changed') {
    const key = asString(event.payload.issueKey);
    if (!key) return 0;
    const issue = await prisma.issue.findUnique({
      where: { key },
      select: {
        title: true,
        reporterId: true,
        assigneeId: true,
        status: { select: { name: true } },
        reporter: { select: { email: true, isActive: true } },
        assignee: { select: { id: true, email: true, isActive: true } },
      },
    });
    if (!issue) return 0;
    // userId → email, so reporter==assignee is naturally deduped by id.
    const recipients = new Map<string, string>();
    if (issue.reporter?.isActive && issue.reporterId !== actorId)
      recipients.set(issue.reporterId, issue.reporter.email);
    if (issue.assignee?.isActive && issue.assignee.id !== actorId)
      recipients.set(issue.assignee.id, issue.assignee.email);
    const title = asString(event.payload.title) ?? issue.title;
    let sent = 0;
    for (const [id, email] of recipients) {
      sent += await sendPersonal(
        outboxId,
        { id, email },
        `${key} → ${issue.status.name}`,
        `${key} — ${title}\n\nEstado actualizado a · Status changed to "${issue.status.name}".`,
        event,
      );
    }
    return sent;
  }

  return 0;
}

/** One open incident per issue (deduped while open). */
export async function ensureIncident(issueKey: string) {
  const issue = await prisma.issue.findUnique({ where: { key: issueKey }, select: { id: true } });
  if (!issue) return null;
  const open = await prisma.incident.findFirst({ where: { issueId: issue.id, status: 'open' } });
  return open ?? prisma.incident.create({ data: { issueId: issue.id } });
}

export async function dispatchEvent(event: DomainEvent, outboxId?: string | null) {
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
    // Idempotent under re-dispatch: a channel already delivered 'sent' for this outbox
    // event is not sent again (so a post-send throw + retry can't double-notify).
    if (outboxId) {
      const already = await prisma.notification.findFirst({
        where: { outboxId, channelId: ch.id, status: 'sent' },
        select: { id: true },
      });
      if (already) {
        delivered += 1;
        continue;
      }
    }
    const notification = await prisma.notification.create({
      data: {
        type: event.type,
        channelId: ch.id,
        outboxId: outboxId ?? null,
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
    await prisma.incident.update({
      where: { id: incidentId },
      data: { lastNotifiedAt: new Date() },
    });
  }

  const userEmails = await deliverPersonal(event, outboxId);
  return { channelsMatched: channels.length, delivered, incidentId, userEmails };
}

/**
 * Drain unprocessed Outbox events. An event is marked processed ONLY after a
 * successful dispatch — an unexpected throw (e.g. a DB blip mid-delivery) leaves
 * processedAt null so the next run retries it, instead of silently losing it
 * (which, for emergency paging, would mean a missed page). The event id is threaded
 * into dispatchEvent so that retry is idempotent: deliveries already recorded 'sent'
 * for this event are not repeated.
 */
export async function dispatchOutboxBatch(limit = 100): Promise<number> {
  const events = await prisma.outbox.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  let processed = 0;
  for (const e of events) {
    try {
      await dispatchEvent(
        { type: e.type, payload: (e.payload as Record<string, unknown>) ?? {} },
        e.id,
      );
      /* c8 ignore start -- retry-on-unexpected-throw safety net. dispatchEvent is internally
         failure-tolerant (delivery failures are recorded on the Notification row, missing
         entities return null), so this only fires on an unexpected infra error (e.g. a DB blip
         mid-batch) that can't be injected deterministically without mocking prisma. */
    } catch {
      // Leave it unprocessed for retry.
      continue;
    }
    /* c8 ignore stop */
    await prisma.outbox.update({ where: { id: e.id }, data: { processedAt: new Date() } });
    processed += 1;
  }
  return processed;
}
