// SPDX-License-Identifier: GPL-3.0-or-later
// Response shapes (the API conforms to these; the web imports them). Dates are
// ISO strings because this is what crosses the wire as JSON.

import type {
  BillingMode,
  ChannelKind,
  ChannelScope,
  IncidentStatus,
  IntakeKind,
  InvoiceStatus,
  IssueType,
  Priority,
  SprintState,
  StatusCategory,
  UserKind,
  UserLocale,
  UserRole,
} from './enums.js';

export interface IntakeSourceView {
  id: string;
  name: string;
  kind: IntakeKind;
  projectId: string;
  defaultType: IssueType;
  defaultPriority: Priority;
  active: boolean;
}

export interface UserView {
  id: string;
  email: string;
  name: string;
  kind: UserKind;
  role: UserRole;
  clientId: string | null;
  /** Per-user UI language preference (es | en | both). */
  locale: UserLocale;
  /** Present on management/list responses; omitted from the session identity. */
  isActive?: boolean;
  /** ISO timestamp of the last completed magic-link sign-in; null if never. */
  lastLoginAt?: string | null;
}

/**
 * Client-safe projection of a user: identity (id) + display name only, never the
 * email or role. Used for any user reference embedded in a payload a client can
 * reach (comment authors, issue assignee/reporter, worklog loggers) so staff PII
 * never crosses the wire to an external client. The full UserView is reserved for
 * the authenticated session identity and the staff-only team/management endpoints.
 */
export interface PublicUserView {
  id: string;
  name: string;
}

/** One of a user's active server sessions, as shown on their account page. */
export interface SessionView {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  /** True for the session making this request (don't offer to revoke it blindly). */
  current: boolean;
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
  /** Status name + category — populated when the issue is loaded with its status. */
  statusName?: string;
  statusCategory?: StatusCategory;
  assignee: PublicUserView | null;
  reporter: PublicUserView | null;
  sprintId: string | null;
  parentId: string | null;
  storyPoints: number | null;
  estimateMinutes: number | null;
  rank: string;
  dueAt: string | null;
  billingMode: BillingMode;
  fixedPriceCents: number | null;
  labels: LabelView[];
  /** Sum of worklog minutes — populated by the board endpoint; optional elsewhere. */
  loggedMinutes?: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface CommentView {
  id: string;
  body: string;
  author: PublicUserView | null;
  createdAt: string;
}

// ── Client portal (M2) ───────────────────────────────────────────────────
export interface PortalProjectRollup {
  key: string;
  name: string;
  open: number;
  inProgress: number;
  done: number;
  totalMinutes: number;
  billableMinutes: number;
  accruedCents: number;
}

export interface PortalOverviewView {
  client: { name: string; currency: string } | null;
  projects: PortalProjectRollup[];
  totals: {
    open: number;
    inProgress: number;
    done: number;
    totalMinutes: number;
    billableMinutes: number;
    accruedCents: number;
    currency: string;
  };
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

/** One calendar month of logged time + accrued cost (the maintenance/monthly lens). */
export interface MonthlyRollupView {
  month: string; // 'YYYY-MM'
  totalMinutes: number;
  billableMinutes: number;
  accruedCents: number;
}

export interface ProjectMonthlyView {
  projectKey: string;
  currency: string;
  /** Optional monthly retainer caps; null when not configured. */
  budgetMinutes: number | null;
  budgetCents: number | null;
  months: MonthlyRollupView[]; // most recent first
}

export interface TimerView {
  id: string;
  issueKey: string;
  startedAt: string;
  elapsedMinutes: number;
}

export interface WorklogView {
  id: string;
  minutes: number;
  note: string;
  billable: boolean;
  startedAt: string | null;
  loggedAt: string;
  user: PublicUserView | null;
}

export interface ChannelView {
  id: string;
  name: string;
  kind: ChannelKind;
  target: string;
  scope: ChannelScope;
  projectId: string | null;
  events: string[];
  active: boolean;
}

export interface IncidentView {
  id: string;
  issueKey: string;
  projectKey: string;
  title: string;
  status: IncidentStatus;
  escalationLevel: number;
  lastNotifiedAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

// ── Invoicing (M5) ─────────────────────────────────────────────────────────
export interface InvoiceLineView {
  id: string;
  issueKey: string;
  description: string;
  minutes: number;
  /** Frozen resolved rate; null for fixed-price lines. */
  hourlyCents: number | null;
  amountCents: number;
}

/** Summary row for the non-fiscal billing-annex list — no lines. */
export interface InvoiceListItemView {
  id: string;
  number: string;
  /** The external TicketBAI fiscal-invoice reference, once recorded; else null. */
  externalInvoiceRef: string | null;
  clientId: string;
  clientName: string;
  status: InvoiceStatus;
  currency: string;
  subtotalCents: number;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  issuedAt: string | null;
  paidAt: string | null;
}

/** Full invoice with its lines — what the printable receipt renders from. */
export interface InvoiceView extends InvoiceListItemView {
  notes: string | null;
  lines: InvoiceLineView[];
}
