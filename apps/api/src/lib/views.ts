// SPDX-License-Identifier: GPL-3.0-or-later
// Map Prisma rows to the wire-facing view types from @gira/shared. Keeping these
// in one place means the API and frontend never disagree about response shapes.

import type {
  Comment,
  Incident,
  IntakeSource,
  Issue,
  Label,
  NotificationChannel,
  Sprint,
  Status,
  Timer,
  User,
  Worklog,
} from '@gira/db';
import type {
  ChannelView,
  CommentView,
  IncidentView,
  IntakeSourceView,
  IssueView,
  LabelView,
  SprintView,
  StatusView,
  TimerView,
  UserView,
  VelocityView,
  WorklogView,
} from '@gira/shared';

export function toIntakeSourceView(s: IntakeSource): IntakeSourceView {
  return {
    id: s.id,
    name: s.name,
    kind: s.kind,
    projectId: s.projectId,
    defaultType: s.defaultType,
    defaultPriority: s.defaultPriority,
    active: s.active,
  };
}

export function toUserView(u: User): UserView {
  return { id: u.id, email: u.email, name: u.name, kind: u.kind, role: u.role, clientId: u.clientId };
}

export function toLabelView(l: Label): LabelView {
  return { id: l.id, name: l.name, color: l.color };
}

export function toStatusView(s: Status): StatusView {
  return { id: s.id, name: s.name, category: s.category, order: s.order };
}

export function toCommentView(c: Comment & { author?: User | null }): CommentView {
  return {
    id: c.id,
    body: c.body,
    author: c.author ? toUserView(c.author) : null,
    createdAt: c.createdAt.toISOString(),
  };
}

export function toWorklogView(w: Worklog & { user?: User | null }): WorklogView {
  return {
    id: w.id,
    minutes: w.minutes,
    note: w.note,
    billable: w.billable,
    startedAt: w.startedAt ? w.startedAt.toISOString() : null,
    loggedAt: w.loggedAt.toISOString(),
    user: w.user ? toUserView(w.user) : null,
  };
}

export function toChannelView(c: NotificationChannel): ChannelView {
  return {
    id: c.id,
    name: c.name,
    kind: c.kind,
    target: c.target,
    scope: c.scope,
    projectId: c.projectId,
    events: c.events,
    active: c.active,
  };
}

export function toIncidentView(
  i: Incident & { issue?: { key: string; title: string; project?: { key: string } } },
): IncidentView {
  return {
    id: i.id,
    issueKey: i.issue?.key ?? '',
    projectKey: i.issue?.project?.key ?? '',
    title: i.issue?.title ?? '',
    status: i.status,
    escalationLevel: i.escalationLevel,
    lastNotifiedAt: i.lastNotifiedAt ? i.lastNotifiedAt.toISOString() : null,
    acknowledgedAt: i.acknowledgedAt ? i.acknowledgedAt.toISOString() : null,
    createdAt: i.createdAt.toISOString(),
  };
}

export function toTimerView(t: Timer & { issue?: { key: string } }, now = new Date()): TimerView {
  return {
    id: t.id,
    issueKey: t.issue?.key ?? '',
    startedAt: t.startedAt.toISOString(),
    elapsedMinutes: Math.max(0, Math.floor((now.getTime() - t.startedAt.getTime()) / 60_000)),
  };
}

export function toSprintView(s: Sprint, velocity?: VelocityView): SprintView {
  return {
    id: s.id,
    projectId: s.projectId,
    name: s.name,
    goal: s.goal,
    startDate: s.startDate ? s.startDate.toISOString() : null,
    endDate: s.endDate ? s.endDate.toISOString() : null,
    state: s.state,
    committedPoints: s.committedPoints,
    completedPoints: s.completedPoints,
    velocity,
  };
}

type IssueWithRelations = Issue & {
  project?: { key: string } | null;
  assignee?: User | null;
  reporter?: User | null;
  labels?: Label[];
  status?: { name: string; category: Status['category'] } | null;
};

export function toIssueView(i: IssueWithRelations, projectKey?: string): IssueView {
  return {
    id: i.id,
    key: i.key,
    projectKey: projectKey ?? i.project?.key ?? '',
    title: i.title,
    description: i.description,
    type: i.type,
    priority: i.priority,
    statusId: i.statusId,
    statusName: i.status?.name,
    statusCategory: i.status?.category,
    assignee: i.assignee ? toUserView(i.assignee) : null,
    reporter: i.reporter ? toUserView(i.reporter) : null,
    sprintId: i.sprintId,
    parentId: i.parentId,
    storyPoints: i.storyPoints,
    estimateMinutes: i.estimateMinutes,
    rank: i.rank,
    billingMode: i.billingMode,
    fixedPriceCents: i.fixedPriceCents,
    labels: (i.labels ?? []).map(toLabelView),
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    closedAt: i.closedAt ? i.closedAt.toISOString() : null,
  };
}
