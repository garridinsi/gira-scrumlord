// SPDX-License-Identifier: GPL-3.0-or-later
// Unit-level coverage for src/lib/views.ts. These are pure row→view mappers, so we
// exercise each conditional/nullish arm directly with hand-built Prisma-shaped rows
// (no buildApp / DB) — mirroring the direct-import style of test/errors.test.ts.
import type { Incident, IssueEvent, Label, Timer, User } from '@gira/db';
import { describe, expect, it } from 'vitest';
import {
  toCommentView,
  toIncidentView,
  toIssueEventView,
  toIssueView,
  toTimerView,
  toWorklogView,
} from '../src/lib/views.js';

// ── Typed factories: full Prisma rows so the mappers type-check, with overrides. ──

function makeUser(over: Partial<User> = {}): User {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'u1',
    email: 'staff@example.com',
    name: 'Staff Member',
    kind: 'staff',
    role: 'member',
    clientId: null,
    isActive: true,
    locale: 'es',
    deactivatedAt: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

type CommentRow = Parameters<typeof toCommentView>[0];
function makeComment(over: Partial<CommentRow> = {}): CommentRow {
  const now = new Date('2026-01-02T03:04:05.000Z');
  return {
    id: 'c1',
    issueId: 'i1',
    authorId: 'u1',
    body: 'hello',
    visibility: 'client',
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

function makeIssueEvent(over: Partial<IssueEvent> = {}): IssueEvent {
  return {
    id: 'e1',
    issueId: 'i1',
    kind: 'created',
    fromStatusId: null,
    toStatusId: 'st1',
    statusCategory: 'todo',
    actorId: 'u1',
    createdAt: new Date('2026-01-03T00:00:00.000Z'),
    ...over,
  };
}

type WorklogRow = Parameters<typeof toWorklogView>[0];
function makeWorklog(over: Partial<WorklogRow> = {}): WorklogRow {
  const now = new Date('2026-01-04T00:00:00.000Z');
  return {
    id: 'w1',
    issueId: 'i1',
    userId: 'u1',
    minutes: 30,
    note: '',
    billable: true,
    startedAt: null,
    loggedAt: now,
    createdAt: now,
    invoiceId: null,
    ...over,
  };
}

function makeIncident(over: Partial<Incident> = {}): Incident {
  const now = new Date('2026-01-05T00:00:00.000Z');
  return {
    id: 'inc1',
    issueId: 'i1',
    status: 'open',
    escalationLevel: 1,
    lastNotifiedAt: null,
    acknowledgedById: null,
    acknowledgedAt: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

function makeLabel(over: Partial<Label> = {}): Label {
  return { id: 'l1', projectId: 'p1', name: 'bug', color: '#ff0000', ...over };
}

type IssueRow = Parameters<typeof toIssueView>[0];
function makeIssue(over: Partial<IssueRow> = {}): IssueRow {
  const now = new Date('2026-01-06T00:00:00.000Z');
  return {
    id: 'i1',
    projectId: 'p1',
    key: 'GIRA-1',
    title: 'An issue',
    description: '',
    type: 'task',
    priority: 'medium',
    statusId: 'st1',
    assigneeId: null,
    reporterId: 'u1',
    sprintId: null,
    parentId: null,
    storyPoints: null,
    estimateMinutes: null,
    dueAt: null,
    rank: '0|hzzzzz:',
    billingMode: 'hourly',
    fixedPriceCents: null,
    externalRef: null,
    intakeSourceId: null,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    resolution: null,
    blockedReason: null,
    severity: null,
    reopenCount: 0,
    moscow: null,
    ...over,
  };
}

type TimerRow = Parameters<typeof toTimerView>[0];

describe('cov src/lib/views.ts', () => {
  // ── toCommentView (line 86) ─────────────────────────────────────────────
  it('toCommentView maps a present author to a public view; null author → null (line 86)', () => {
    const author = makeUser({ id: 'au1', name: 'Author', email: 'a@x.com' });
    const withAuthor = toCommentView(makeComment({ author }));
    expect(withAuthor.author).toEqual({ id: 'au1', name: 'Author' });
    // Email/role never leak through the public projection.
    expect(withAuthor.author).not.toHaveProperty('email');

    const noAuthor = toCommentView(makeComment({ author: null }));
    expect(noAuthor.author).toBeNull();
  });

  it('toCommentView clamps non-internal visibility to client', () => {
    expect(toCommentView(makeComment({ visibility: 'internal' })).visibility).toBe('internal');
    expect(toCommentView(makeComment({ visibility: 'client' })).visibility).toBe('client');
    // Any other free-string value collapses to 'client'.
    expect(toCommentView(makeComment({ visibility: 'weird' })).visibility).toBe('client');
  });

  // ── toIssueEventView (lines 100, 101) ───────────────────────────────────
  it('toIssueEventView keeps a known kind (line 100)', () => {
    expect(toIssueEventView(makeIssueEvent({ kind: 'created' })).kind).toBe('created');
    expect(toIssueEventView(makeIssueEvent({ kind: 'status_changed' })).kind).toBe(
      'status_changed',
    );
    expect(toIssueEventView(makeIssueEvent({ kind: 'reopened' })).kind).toBe('reopened');
  });

  it('toIssueEventView defaults an out-of-band kind to status_changed (line 101)', () => {
    const view = toIssueEventView(makeIssueEvent({ kind: 'garbage-out-of-band' }));
    expect(view.kind).toBe('status_changed');
  });

  // ── toWorklogView (line 118) ────────────────────────────────────────────
  it('toWorklogView maps a present user; null user → null (line 118)', () => {
    const user = makeUser({ id: 'lu1', name: 'Logger' });
    const withUser = toWorklogView(makeWorklog({ user }));
    expect(withUser.user).toEqual({ id: 'lu1', name: 'Logger' });

    const noUser = toWorklogView(makeWorklog({ user: null }));
    expect(noUser.user).toBeNull();
  });

  it('toWorklogView serialises startedAt when present, null otherwise', () => {
    const started = new Date('2026-02-01T10:00:00.000Z');
    expect(toWorklogView(makeWorklog({ startedAt: started })).startedAt).toBe(
      started.toISOString(),
    );
    expect(toWorklogView(makeWorklog({ startedAt: null })).startedAt).toBeNull();
  });

  // ── toIncidentView (lines 140, 141, 142, 145) ───────────────────────────
  it('toIncidentView populates issueKey/projectKey/title from the relation (lines 140-142)', () => {
    const row: Incident & {
      issue?: { key: string; title: string; project?: { key: string } };
    } = {
      ...makeIncident({ lastNotifiedAt: new Date('2026-03-02T08:00:00.000Z') }),
      issue: { key: 'GIRA-9', title: 'Prod down', project: { key: 'GIRA' } },
    };
    const view = toIncidentView(row);
    expect(view.issueKey).toBe('GIRA-9');
    expect(view.projectKey).toBe('GIRA');
    expect(view.title).toBe('Prod down');
    // lastNotifiedAt present → ISO string (line 145 truthy arm).
    expect(view.lastNotifiedAt).toBe('2026-03-02T08:00:00.000Z');
  });

  it('toIncidentView falls back to empty strings + null when the relation is absent (lines 140-142, 145)', () => {
    const view = toIncidentView(makeIncident({ lastNotifiedAt: null }));
    expect(view.issueKey).toBe('');
    expect(view.projectKey).toBe('');
    expect(view.title).toBe('');
    expect(view.lastNotifiedAt).toBeNull();
  });

  // ── toTimerView (line 154) ──────────────────────────────────────────────
  it('toTimerView reads issue.key when present, else empty (line 154)', () => {
    const base: Timer = {
      id: 't1',
      issueId: 'i1',
      userId: 'u1',
      startedAt: new Date('2026-04-01T00:00:00.000Z'),
    };
    const withIssue: TimerRow = { ...base, issue: { key: 'GIRA-7' } };
    const now = new Date('2026-04-01T00:30:00.000Z');
    const view = toTimerView(withIssue, now);
    expect(view.issueKey).toBe('GIRA-7');
    expect(view.elapsedMinutes).toBe(30);

    expect(toTimerView(base, now).issueKey).toBe('');
  });

  // ── toIssueView (lines 187, 196, 205, 212) ──────────────────────────────
  it('toIssueView resolves projectKey: explicit arg wins (line 187)', () => {
    const view = toIssueView(makeIssue(), 'EXPLICIT');
    expect(view.projectKey).toBe('EXPLICIT');
  });

  it('toIssueView resolves projectKey: falls back to relation then empty (line 187)', () => {
    const withRel: IssueRow = { ...makeIssue(), project: { key: 'RELKEY' } };
    expect(toIssueView(withRel).projectKey).toBe('RELKEY');
    // No arg, no relation → ''.
    expect(toIssueView(makeIssue()).projectKey).toBe('');
  });

  it('toIssueView maps reporter + assignee to public views (line 196)', () => {
    const reporter = makeUser({ id: 'rep1', name: 'Reporter', email: 'r@x.com' });
    const assignee = makeUser({ id: 'asg1', name: 'Assignee' });
    const view = toIssueView(makeIssue({ reporter, assignee }));
    expect(view.reporter).toEqual({ id: 'rep1', name: 'Reporter' });
    expect(view.assignee).toEqual({ id: 'asg1', name: 'Assignee' });

    const bare = toIssueView(makeIssue());
    expect(bare.reporter).toBeNull();
    expect(bare.assignee).toBeNull();
  });

  it('toIssueView maps labels and defaults reopenCount (lines 205, 212)', () => {
    const labels = [makeLabel({ id: 'l1', name: 'bug' }), makeLabel({ id: 'l2', name: 'ui' })];
    const view = toIssueView(makeIssue({ labels, reopenCount: 3 }));
    expect(view.labels).toEqual([
      { id: 'l1', name: 'bug', color: '#ff0000' },
      { id: 'l2', name: 'ui', color: '#ff0000' },
    ]);
    expect(view.reopenCount).toBe(3);

    // labels omitted → []; reopenCount nullish → 0 (the ?? 0 arm on line 212).
    const fallback = toIssueView(
      makeIssue({ reopenCount: null as unknown as number, labels: undefined }),
    );
    expect(fallback.labels).toEqual([]);
    expect(fallback.reopenCount).toBe(0);
  });
});
