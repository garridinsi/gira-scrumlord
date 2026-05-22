// SPDX-License-Identifier: GPL-3.0-or-later
// Response shapes (the API conforms to these; the web imports them). Dates are
// ISO strings because this is what crosses the wire as JSON.

import type {
  BillingMode,
  IssueType,
  Priority,
  SprintState,
  StatusCategory,
  UserKind,
  UserRole,
} from './enums.js';

export interface UserView {
  id: string;
  email: string;
  name: string;
  kind: UserKind;
  role: UserRole;
  clientId: string | null;
}

export interface LabelView {
  id: string;
  name: string;
  color: string;
}

export interface StatusView {
  id: string;
  name: string;
  category: StatusCategory;
  order: number;
}

export interface IssueView {
  id: string;
  key: string;
  projectKey: string;
  title: string;
  description: string;
  type: IssueType;
  priority: Priority;
  statusId: string;
  assignee: UserView | null;
  reporter: UserView | null;
  sprintId: string | null;
  parentId: string | null;
  storyPoints: number | null;
  estimateMinutes: number | null;
  rank: string;
  billingMode: BillingMode;
  fixedPriceCents: number | null;
  labels: LabelView[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface CommentView {
  id: string;
  body: string;
  author: UserView | null;
  createdAt: string;
}

export interface VelocityView {
  committedPoints: number;
  completedPoints: number;
  completedCount: number;
  totalPoints: number;
  totalCount: number;
}

export interface SprintView {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  state: SprintState;
  committedPoints: number | null;
  completedPoints: number | null;
  velocity?: VelocityView;
}

export interface BoardColumn {
  status: StatusView;
  issues: IssueView[];
}

export interface BoardView {
  projectKey: string;
  columns: BoardColumn[];
}

export interface CostView {
  issueKey: string;
  minutes: number;
  billableMinutes: number;
  billingMode: BillingMode;
  hourlyCents: number | null;
  currency: string;
  accruedCents: number;
}

export interface ProjectSummaryView {
  projectKey: string;
  currency: string;
  totalMinutes: number;
  billableMinutes: number;
  accruedCents: number;
  openIssues: number;
  doneIssues: number;
  activeSprint: { id: string; name: string; velocity: VelocityView } | null;
}

export interface TimerView {
  id: string;
  issueKey: string;
  startedAt: string;
  elapsedMinutes: number;
}
