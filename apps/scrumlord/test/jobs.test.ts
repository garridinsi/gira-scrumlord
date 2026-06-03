// SPDX-License-Identifier: GPL-3.0-or-later
// Integration tests for scrumlord background jobs.
// All fixtures are entirely fictional (Acme Corp, Wile E. Coyote, etc.).
// Real DB operations — no stubs.

import { describe, it, expect, beforeEach } from 'vitest';
import { prisma, resetDb } from './helpers/db.js';
import { runTimerReap } from '../src/jobs/timer-reap.js';
import { runSprintAutoclose } from '../src/jobs/sprint-autoclose.js';
import { runOutboxDispatch } from '../src/jobs/outbox-dispatch.js';
import { runHousekeeping } from '../src/jobs/housekeeping.js';
import { runVelocitySnapshot } from '../src/jobs/velocity-snapshot.js';

// ── Shared fixture IDs ───────────────────────────────────────────────────────

async function createBaseFixtures() {
  // Fictional client / user / project / statuses
  const client = await prisma.client.create({
    data: {
      name: 'Acme Corp',
      slug: 'acme',
      currency: 'USD',
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'wile.e.coyote@acme.example',
      name: 'Wile E. Coyote',
      kind: 'staff',
      role: 'member',
      clientId: client.id,
    },
  });

  const project = await prisma.project.create({
    data: {
      key: 'ACME',
      name: 'Acme Rocket Sled Project',
      clientId: client.id,
    },
  });

  // Two statuses: one in_progress, one done
  const inProgressStatus = await prisma.status.create({
    data: {
      projectId: project.id,
      name: 'In Progress',
      category: 'in_progress',
      order: 2,
    },
  });

  const doneStatus = await prisma.status.create({
    data: {
      projectId: project.id,
      name: 'Done',
      category: 'done',
      order: 3,
    },
  });

  const todoStatus = await prisma.status.create({
    data: {
      projectId: project.id,
      name: 'To Do',
      category: 'todo',
      order: 1,
    },
  });

  return { client, user, project, inProgressStatus, doneStatus, todoStatus };
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await resetDb();
});

// ── (a) timer-reap ───────────────────────────────────────────────────────────

describe('runTimerReap', () => {
  it('reaps a timer older than 12h into a single capped (720-min) worklog and removes the timer', async () => {
    const { user, project, inProgressStatus } = await createBaseFixtures();

    // Create an issue
    const issue = await prisma.issue.create({
      data: {
        projectId: project.id,
        key: 'ACME-1',
        title: 'Build the rocket sled',
        statusId: inProgressStatus.id,
        reporterId: user.id,
        rank: 'aaa',
      },
    });

    // Timer started 14 hours ago — well past the 12h threshold.
    // Elapsed minutes = 840, capped to 720.
    const fourteenHoursAgo = new Date(Date.now() - 14 * 60 * 60 * 1000);

    await prisma.timer.create({
      data: {
        issueId: issue.id,
        userId: user.id,
        startedAt: fourteenHoursAgo,
      },
    });

    const now = new Date();
    const reaped = await runTimerReap(now);

    expect(reaped).toBe(1);

    // Timer must be gone
    const remainingTimers = await prisma.timer.findMany({ where: { userId: user.id } });
    expect(remainingTimers).toHaveLength(0);

    // One worklog must exist, capped at 720 min
    const worklogs = await prisma.worklog.findMany({ where: { issueId: issue.id } });
    expect(worklogs).toHaveLength(1);

    const wl = worklogs[0]!;
    expect(wl.minutes).toBe(720);
    expect(wl.billable).toBe(true);
    expect(wl.note).toBe('auto-stopped by scrumlord');
    expect(wl.startedAt).toEqual(fourteenHoursAgo);
    expect(wl.userId).toBe(user.id);
  });

  it('is idempotent across runs — a reaped timer is never billed twice', async () => {
    const { user, project, inProgressStatus } = await createBaseFixtures();
    const issue = await prisma.issue.create({
      data: {
        projectId: project.id,
        key: 'ACME-3',
        title: 'Idempotent reap',
        statusId: inProgressStatus.id,
        reporterId: user.id,
        rank: 'zzz',
      },
    });
    await prisma.timer.create({
      data: {
        issueId: issue.id,
        userId: user.id,
        startedAt: new Date(Date.now() - 14 * 60 * 60 * 1000),
      },
    });

    expect(await runTimerReap(new Date())).toBe(1);
    // Second pass finds the timer already gone (delete-first) — nothing to reap, no 2nd worklog.
    expect(await runTimerReap(new Date())).toBe(0);
    expect(await prisma.worklog.count({ where: { issueId: issue.id } })).toBe(1);
  });

  it('does not reap a timer that is less than 12h old', async () => {
    const { user, project, inProgressStatus } = await createBaseFixtures();

    const issue = await prisma.issue.create({
      data: {
        projectId: project.id,
        key: 'ACME-2',
        title: 'Test under 12h timer',
        statusId: inProgressStatus.id,
        reporterId: user.id,
        rank: 'bbb',
      },
    });

    // Timer started only 2 hours ago — should not be reaped.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await prisma.timer.create({
      data: {
        issueId: issue.id,
        userId: user.id,
        startedAt: twoHoursAgo,
      },
    });

    const reaped = await runTimerReap(new Date());
    expect(reaped).toBe(0);

    // Timer still exists
    const timers = await prisma.timer.findMany({ where: { userId: user.id } });
    expect(timers).toHaveLength(1);
  });
});

// ── (b) sprint-autoclose ─────────────────────────────────────────────────────

describe('runSprintAutoclose', () => {
  it('closes an active sprint past its endDate with completedPoints = sum of done-issue story points', async () => {
    const { user, project, doneStatus, todoStatus } = await createBaseFixtures();

    // Sprint that ended yesterday
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const sprint = await prisma.sprint.create({
      data: {
        projectId: project.id,
        name: 'Sprint 1 — Rocket Sled',
        state: 'active',
        startDate: twoDaysAgo,
        endDate: yesterday,
        committedPoints: 13,
      },
    });

    // Issue 1: done, 5 points
    await prisma.issue.create({
      data: {
        projectId: project.id,
        key: 'ACME-10',
        title: 'Buy ACME rocket fuel',
        statusId: doneStatus.id,
        reporterId: user.id,
        sprintId: sprint.id,
        storyPoints: 5,
        rank: 'ccc',
      },
    });

    // Issue 2: done, 8 points
    await prisma.issue.create({
      data: {
        projectId: project.id,
        key: 'ACME-11',
        title: 'Attach rocket to sled',
        statusId: doneStatus.id,
        reporterId: user.id,
        sprintId: sprint.id,
        storyPoints: 8,
        rank: 'ddd',
      },
    });

    // Issue 3: not done (todo), 3 points — should NOT count
    await prisma.issue.create({
      data: {
        projectId: project.id,
        key: 'ACME-12',
        title: 'Test sled on cliff edge',
        statusId: todoStatus.id,
        reporterId: user.id,
        sprintId: sprint.id,
        storyPoints: 3,
        rank: 'eee',
      },
    });

    const now = new Date();
    const closed = await runSprintAutoclose(now);

    expect(closed).toBe(1);

    const updated = await prisma.sprint.findUniqueOrThrow({ where: { id: sprint.id } });
    expect(updated.state).toBe('closed');
    // done points: 5 + 8 = 13
    expect(updated.completedPoints).toBe(13);
  });

  it('returns unfinished issues to the backlog (detaches non-done) on autoclose', async () => {
    const { user, project, doneStatus, todoStatus } = await createBaseFixtures();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sprint = await prisma.sprint.create({
      data: {
        projectId: project.id,
        name: 'Detach test',
        state: 'active',
        endDate: yesterday,
        committedPoints: 8,
      },
    });
    const doneIssue = await prisma.issue.create({
      data: {
        projectId: project.id,
        key: 'ACME-20',
        title: 'shipped',
        statusId: doneStatus.id,
        reporterId: user.id,
        sprintId: sprint.id,
        storyPoints: 5,
        rank: 'aaa',
      },
    });
    const openIssue = await prisma.issue.create({
      data: {
        projectId: project.id,
        key: 'ACME-21',
        title: 'carryover',
        statusId: todoStatus.id,
        reporterId: user.id,
        sprintId: sprint.id,
        storyPoints: 3,
        rank: 'bbb',
      },
    });

    expect(await runSprintAutoclose(new Date())).toBe(1);

    // The done issue stays on the (now closed) sprint as part of its record; the
    // unfinished one returns to the backlog instead of being orphaned on a closed sprint.
    expect((await prisma.issue.findUniqueOrThrow({ where: { id: doneIssue.id } })).sprintId).toBe(
      sprint.id,
    );
    expect(
      (await prisma.issue.findUniqueOrThrow({ where: { id: openIssue.id } })).sprintId,
    ).toBeNull();
  });

  it('does not close an active sprint whose endDate is in the future', async () => {
    const { project } = await createBaseFixtures();

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const sprint = await prisma.sprint.create({
      data: {
        projectId: project.id,
        name: 'Future Sprint',
        state: 'active',
        endDate: tomorrow,
      },
    });

    const closed = await runSprintAutoclose(new Date());
    expect(closed).toBe(0);

    const unchanged = await prisma.sprint.findUniqueOrThrow({ where: { id: sprint.id } });
    expect(unchanged.state).toBe('active');
  });
});

// ── (c) outbox-dispatch ──────────────────────────────────────────────────────

describe('runOutboxDispatch', () => {
  it('sets processedAt on unprocessed rows and returns the correct count', async () => {
    // Insert 3 unprocessed + 1 already processed
    const processedEarlier = new Date(Date.now() - 5 * 60 * 1000);

    await prisma.outbox.createMany({
      data: [
        { type: 'sprint.started', payload: { sprintId: 'abc' } },
        { type: 'issue.moved', payload: { issueKey: 'ACME-1' } },
        {
          type: 'issue.priority.emergency',
          payload: { issueKey: 'ACME-2', priority: 'emergency' },
        },
        { type: 'timer.stopped', payload: { timerId: 'xyz' }, processedAt: processedEarlier },
      ],
    });

    const now = new Date();
    const count = await runOutboxDispatch(now);

    // Only 3 unprocessed rows should be dispatched
    expect(count).toBe(3);

    const allRows = await prisma.outbox.findMany({ orderBy: { createdAt: 'asc' } });
    expect(allRows).toHaveLength(4);

    // The 3 newly processed rows should have processedAt = now
    const dispatched = allRows.filter((r) => r.type !== 'timer.stopped');
    for (const row of dispatched) {
      expect(row.processedAt).not.toBeNull();
      // processedAt should be close to now (within 1 second)
      expect(Math.abs(row.processedAt!.getTime() - now.getTime())).toBeLessThan(1000);
    }

    // The already-processed row must not have been re-dispatched
    const alreadyDone = allRows.find((r) => r.type === 'timer.stopped');
    expect(alreadyDone!.processedAt).toEqual(processedEarlier);
  });

  it('returns 0 when there are no unprocessed rows', async () => {
    const count = await runOutboxDispatch(new Date());
    expect(count).toBe(0);
  });

  it('does not touch rows that are already processed', async () => {
    const processedEarlier = new Date(Date.now() - 10 * 60 * 1000);

    await prisma.outbox.create({
      data: {
        type: 'issue.closed',
        payload: { issueKey: 'ACME-99' },
        processedAt: processedEarlier,
      },
    });

    const count = await runOutboxDispatch(new Date());
    expect(count).toBe(0);

    const row = await prisma.outbox.findFirstOrThrow();
    expect(row.processedAt).toEqual(processedEarlier);
  });
});

// ── (c2) velocity-snapshot ───────────────────────────────────────────────────

describe('runVelocitySnapshot', () => {
  it('recomputes completedPoints for active sprints (committed snapshot untouched)', async () => {
    const { user, project, doneStatus, todoStatus } = await createBaseFixtures();
    const sprint = await prisma.sprint.create({
      data: { projectId: project.id, name: 'Live sprint', state: 'active', committedPoints: 10 },
    });
    await prisma.issue.create({
      data: {
        projectId: project.id,
        key: 'ACME-30',
        title: 'done',
        statusId: doneStatus.id,
        reporterId: user.id,
        sprintId: sprint.id,
        storyPoints: 5,
        rank: 'a',
      },
    });
    await prisma.issue.create({
      data: {
        projectId: project.id,
        key: 'ACME-31',
        title: 'wip',
        statusId: todoStatus.id,
        reporterId: user.id,
        sprintId: sprint.id,
        storyPoints: 3,
        rank: 'b',
      },
    });

    expect(await runVelocitySnapshot()).toBe(1);
    const updated = await prisma.sprint.findUniqueOrThrow({ where: { id: sprint.id } });
    expect(updated.completedPoints).toBe(5); // only the done issue's points
    expect(updated.committedPoints).toBe(10); // committed snapshot is left alone
  });

  it('returns 0 when no sprint is active', async () => {
    await createBaseFixtures();
    expect(await runVelocitySnapshot()).toBe(0);
  });
});

// ── (d) housekeeping ─────────────────────────────────────────────────────────

describe('runHousekeeping', () => {
  it('reaps expired/revoked sessions, spent tokens, and old processed outbox — keeps fresh rows', async () => {
    const { user } = await createBaseFixtures();
    const now = new Date();
    const past = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago
    const future = new Date(now.getTime() + 60 * 60 * 1000); // 1h ahead
    const longAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    const recent = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago

    // Sessions: expired, revoked, and a live one.
    await prisma.session.create({ data: { userId: user.id, tokenHash: 'h1', expiresAt: past } });
    await prisma.session.create({
      data: { userId: user.id, tokenHash: 'h2', expiresAt: future, revokedAt: past },
    });
    const liveSession = await prisma.session.create({
      data: { userId: user.id, tokenHash: 'h3', expiresAt: future },
    });

    // Tokens: expired, consumed, and a live one.
    await prisma.magicLinkToken.create({
      data: { email: 'a@x.test', tokenHash: 't1', expiresAt: past },
    });
    await prisma.magicLinkToken.create({
      data: { email: 'b@x.test', tokenHash: 't2', expiresAt: future, consumedAt: past },
    });
    const liveToken = await prisma.magicLinkToken.create({
      data: { email: 'c@x.test', tokenHash: 't3', expiresAt: future },
    });

    // Outbox: old-processed (reaped), recent-processed (kept), unprocessed (kept).
    await prisma.outbox.create({ data: { type: 'x', payload: {}, processedAt: longAgo } });
    await prisma.outbox.create({ data: { type: 'y', payload: {}, processedAt: recent } });
    await prisma.outbox.create({ data: { type: 'z', payload: {} } });

    const reaped = await runHousekeeping(now);
    expect(reaped).toBe(5); // 2 sessions + 2 tokens + 1 outbox

    expect(await prisma.session.findMany()).toHaveLength(1);
    expect((await prisma.session.findMany())[0]!.id).toBe(liveSession.id);
    expect(await prisma.magicLinkToken.findMany()).toHaveLength(1);
    expect((await prisma.magicLinkToken.findMany())[0]!.id).toBe(liveToken.id);
    expect(await prisma.outbox.findMany()).toHaveLength(2);
  });
});
