// SPDX-License-Identifier: GPL-3.0-or-later
import { type Server, createServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dispatchEvent } from '../src/dispatch.js';
import { makeIssue, prisma, resetDb } from './helpers/db.js';

describe('dispatch', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('matches an emergency channel, opens one incident (deduped), and delivers', async () => {
    await makeIssue('T-1', 'T');
    await prisma.notificationChannel.create({
      data: {
        name: 'oncall email',
        kind: 'email',
        target: 'oncall@example.test',
        scope: 'global',
        events: ['issue.emergency'],
      },
    });

    const ev = {
      type: 'issue.emergency',
      payload: { issueKey: 'T-1', projectKey: 'T', title: 'PROD DOWN' },
    };
    const first = await dispatchEvent(ev);
    expect(first.channelsMatched).toBe(1);
    expect(first.delivered).toBe(1);
    expect(first.incidentId).toBeTruthy();

    // dispatching again reuses the open incident (no duplicate page-storm of incidents)
    const second = await dispatchEvent(ev);
    expect(second.incidentId).toBe(first.incidentId);
    expect(await prisma.incident.count()).toBe(1);
    expect(await prisma.notification.count()).toBe(2);
  });

  it('does not match channels subscribed to other event types', async () => {
    await makeIssue('T-1', 'T');
    await prisma.notificationChannel.create({
      data: {
        name: 'assignments',
        kind: 'email',
        target: 'a@example.test',
        scope: 'global',
        events: ['issue.assigned'],
      },
    });
    const res = await dispatchEvent({
      type: 'issue.emergency',
      payload: { issueKey: 'T-1', projectKey: 'T' },
    });
    expect(res.channelsMatched).toBe(0);
  });

  it('respects project scope', async () => {
    await makeIssue('T-1', 'T');
    const other = await prisma.project.create({ data: { key: 'OTHER', name: 'Other' } });
    await prisma.notificationChannel.create({
      data: {
        name: 'other only',
        kind: 'email',
        target: 'x@example.test',
        scope: 'project',
        projectId: other.id,
        events: ['issue.emergency'],
      },
    });
    const res = await dispatchEvent({
      type: 'issue.emergency',
      payload: { issueKey: 'T-1', projectKey: 'T' },
    });
    expect(res.channelsMatched).toBe(0);
  });

  describe('webhook delivery', () => {
    let server: Server;
    let received: { body: string } | null = null;
    let url = '';
    beforeEach(async () => {
      received = null;
      server = createServer((req, res) => {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          received = { body };
          res.writeHead(200).end('ok');
        });
      });
      await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
      url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/hook`;
    });
    afterEach(async () => {
      await new Promise<void>((r) => server.close(() => r()));
    });

    it('POSTs the payload to a webhook channel', async () => {
      await makeIssue('T-1', 'T');
      await prisma.notificationChannel.create({
        data: {
          name: 'hook',
          kind: 'webhook',
          target: url,
          scope: 'global',
          events: ['issue.emergency'],
        },
      });
      const res = await dispatchEvent({
        type: 'issue.emergency',
        payload: { issueKey: 'T-1', projectKey: 'T', title: 'down' },
      });
      expect(res.delivered).toBe(1);
      expect(received).not.toBeNull();
      expect(JSON.parse(received!.body)).toMatchObject({
        type: 'issue.emergency',
        issueKey: 'T-1',
      });
    });
  });

  describe('per-user notifications', () => {
    it('emails the assignee on assignment, but not when they assigned themselves', async () => {
      const { issue } = await makeIssue('T-9', 'T9');
      const assignee = await prisma.user.create({
        data: { email: 'dev@example.test', name: 'Dev' },
      });
      await prisma.issue.update({ where: { id: issue.id }, data: { assigneeId: assignee.id } });

      const payload = {
        issueKey: 'T-9',
        assigneeId: assignee.id,
        title: 'PROD DOWN',
        actorId: 'someone-else',
      };
      expect((await dispatchEvent({ type: 'issue.assigned', payload })).userEmails).toBe(1);
      // self-assignment → no email to yourself
      expect(
        (
          await dispatchEvent({
            type: 'issue.assigned',
            payload: { ...payload, actorId: assignee.id },
          })
        ).userEmails,
      ).toBe(0);
      // inactive assignee → skipped
      await prisma.user.update({ where: { id: assignee.id }, data: { isActive: false } });
      expect((await dispatchEvent({ type: 'issue.assigned', payload })).userEmails).toBe(0);
    });

    it('emails the reporter on status change, skipping the actor', async () => {
      const { user } = await makeIssue('T-10', 'T10'); // user = reporter
      const payload = { issueKey: 'T-10', title: 'PROD DOWN', actorId: 'staff-x' };
      expect((await dispatchEvent({ type: 'issue.status_changed', payload })).userEmails).toBe(1);
      // the reporter made the change → no self-email
      expect(
        (
          await dispatchEvent({
            type: 'issue.status_changed',
            payload: { ...payload, actorId: user.id },
          })
        ).userEmails,
      ).toBe(0);
    });
  });
});
