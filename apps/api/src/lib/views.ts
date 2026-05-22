// SPDX-License-Identifier: GPL-3.0-or-later
// Map Prisma rows to the wire-facing view types from @gira/shared. Keeping these
// in one place means the API and frontend never disagree about response shapes.

import type { Comment, Issue, Label, Status, User } from '@gira/db';
import type { CommentView, IssueView, LabelView, StatusView, UserView } from '@gira/shared';

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

type IssueWithRelations = Issue & {
  project?: { key: string } | null;
  assignee?: User | null;
  reporter?: User | null;
  labels?: Label[];
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
