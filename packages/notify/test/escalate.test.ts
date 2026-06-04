// SPDX-License-Identifier: GPL-3.0-or-later
import { beforeEach, describe, expect, it } from 'vitest';
import { escalateOpenIncidents } from '../src/escalate.js';
import { makeIssue, prisma, resetDb } from './helpers/db.js';

describe('escalation', () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.notificationChannel.create({
      data: {
        name: 'oncall',
        kind: 'email',
        target: 'oncall@example.test',
        scope: 'global',
        events: ['issue.emergency'],
      },
    });
  });

  it('re-pages an open incident past the interval and bumps the level', async () => {
    const { issue } = await makeIssue('T-1', 'T');
    await prisma.incident.create({
      data: {
        issueId: issue.id,
        status: 'open',
        escalationLevel: 0,
        lastNotifiedAt: new Date(Date.now() - 10 * 60_000),
      },
    });
    const escalated = await escalateOpenIncidents({ intervalMinutes: 5, maxLevel: 3 });
    expect(escalated).toBe(1);
    const inc = await prisma.incident.findFirst({ where: { issueId: issue.id } });
    expect(inc?.escalationLevel).toBe(1);
  });

  it('skips acknowledged incidents', async () => {
    const { issue } = await makeIssue('T-1', 'T');
    await prisma.incident.create({
      data: {
        issueId: issue.id,
        status: 'acked',
        lastNotifiedAt: new Date(Date.now() - 60 * 60_000),
      },
    });
    expect(await escalateOpenIncidents({ intervalMinutes: 5 })).toBe(0);
  });

  it('does not escalate beyond the max level', async () => {
    const { issue } = await makeIssue('T-1', 'T');
    await prisma.incident.create({
      data: {
        issueId: issue.id,
        status: 'open',
        escalationLevel: 3,
        lastNotifiedAt: new Date(Date.now() - 60 * 60_000),
      },
    });
    expect(await escalateOpenIncidents({ intervalMinutes: 5, maxLevel: 3 })).toBe(0);
  });

  it('leaves recently-notified incidents alone', async () => {
    const { issue } = await makeIssue('T-1', 'T');
    await prisma.incident.create({
      data: { issueId: issue.id, status: 'open', escalationLevel: 0, lastNotifiedAt: new Date() },
    });
    expect(await escalateOpenIncidents({ intervalMinutes: 5 })).toBe(0);
  });

  it('falls back to default interval/maxLevel/now when called with no options', async () => {
    const { issue } = await makeIssue('T-9', 'T');
    await prisma.incident.create({
      data: {
        issueId: issue.id,
        status: 'open',
        escalationLevel: 0,
        lastNotifiedAt: new Date(Date.now() - 10 * 60_000), // older than the default 5-min interval
      },
    });
    expect(await escalateOpenIncidents()).toBe(1); // defaults: 5 min · level 3 · now
  });
});
