// SPDX-License-Identifier: GPL-3.0-or-later
import type {
  UserView,
  IssueView,
  BoardView,
  StatusView,
  LabelView,
  CostView,
  ProjectSummaryView,
  TimerView,
  ChannelView,
  IncidentView,
  IntakeSourceView,
  PortalOverviewView,
  InvoiceView,
  InvoiceListItemView,
  VelocityView,
  ProjectMonthlyView,
  SessionView,
  InboxItemView,
  ContractView,
  SlaView,
  IssueEventView,
  AttachmentView,
  PeriodLockView,
  KbArticleView,
  SlaPolicyView,
  SlaAttainmentView,
  TelegramStatusView,
} from '@gira/shared';
import type {
  CreateChannel,
  UpdateChannel,
  CreateIntakeSource,
  UpdateIntakeSource,
  CreateAssignmentRule,
  CreateIssue,
  UpdateIssue,
  MoveIssue,
  CreateComment,
  CreateWorklog,
  UpdateWorklog,
  CreateClient,
  UpdateClient,
  CreateContract,
  UpdateContract,
  CreateAttachment,
  CreateKbArticle,
  UpdateKbArticle,
  UpsertSlaPolicy,
  CreateProject,
  UpdateProject,
  CreateStatus,
  UpdateStatus,
  CreateLabel,
  CreateSprint,
  UpdateSprint,
  UpsertRate,
  IssueFilter,
  CreateRequest,
  CreateUser,
  UpdateUser,
  SelfProfile,
} from '@gira/shared';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  // Only declare a JSON content-type when we actually send a body. Fastify rejects
  // an empty body sent with `content-type: application/json` (400), which would
  // break every bodyless POST: logout, timer stop, sprint start/close, invoice
  // issue/pay/void.
  const headers: Record<string, string> = { ...((init?.headers as Record<string, string>) ?? {}) };
  if (init?.body != null && !('Content-Type' in headers)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (res.status === 204) return undefined as T;

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    throw new ApiError(res.status, body, errorMessage(body, res.status));
  }

  return body as T;
}

/**
 * Derive a human message from the API's error envelope. The API sends
 * `{ error }` (the human text for app errors like "only a draft annex can be
 * issued", or a code like "validation_error"/"already_exists"), optionally with
 * Zod `issues` or a `message`. Read those in order so users see the real cause
 * instead of a bare "HTTP 400".
 */
export function errorMessage(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null) {
    const b = body as Record<string, unknown>;
    // Zod validation: surface the first issue ("path: message").
    if (b.error === 'validation_error' && Array.isArray(b.issues) && b.issues.length > 0) {
      const first = b.issues[0] as { path?: unknown[]; message?: string };
      const where =
        Array.isArray(first.path) && first.path.length ? `${first.path.join('.')}: ` : '';
      return `${where}${first.message ?? 'invalid input'}`;
    }
    if (typeof b.message === 'string') return b.message;
    if (typeof b.error === 'string') return humanizeCode(b.error);
  }
  return `HTTP ${status}`;
}

/** Turn the API's machine codes into readable text; pass through human messages. */
function humanizeCode(code: string): string {
  switch (code) {
    case 'already_exists':
      return 'That already exists · Ya existe';
    case 'not_found':
      return 'Not found · No encontrado';
    case 'in_use':
      return 'Still referenced by other records · En uso por otros registros';
    case 'internal_error':
      return 'Something went wrong · Algo salió mal';
    default:
      return code; // HttpError messages arrive here verbatim (already human)
  }
}

function json(body: unknown): RequestInit {
  return { body: JSON.stringify(body) };
}

/**
 * Fire-and-forget crash report to the server log sink (`POST /client-errors`).
 * Never throws and never blocks the error UI — reporting a fault must not itself
 * become a fault. `keepalive` lets it survive an immediate unload/reload.
 */
export function reportClientError(payload: {
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
}): void {
  try {
    void fetch(`${BASE_URL}/client-errors`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* swallow — reporting must never break the boundary */
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = {
  list: (includeInactive = false) =>
    request<UserView[]>(`/users${includeInactive ? '?includeInactive=true' : ''}`),
  create: (data: CreateUser) => request<UserView>('/users', { method: 'POST', ...json(data) }),
  update: (id: string, data: UpdateUser) =>
    request<UserView>(`/users/${id}`, { method: 'PATCH', ...json(data) }),
  invite: (id: string) => request<{ sent: boolean }>(`/users/${id}/invite`, { method: 'POST' }),
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const system = {
  health: () => request<{ status: string; db: boolean; name: string; version: string }>('/health'),
};

export const auth = {
  magicLink: (email: string) =>
    request<void>('/auth/magic-link', { method: 'POST', ...json({ email }) }),

  callback: (token: string) =>
    request<{ user: UserView }>('/auth/callback', { method: 'POST', ...json({ token }) }),

  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  // /auth/me returns { user }, like /auth/callback — unwrap so me.data is a UserView
  // (otherwise me.data.kind is undefined and client users never reach the portal).
  me: () => request<{ user: UserView }>('/auth/me').then((r) => r.user),

  // Self-service profile (name + locale only — never role/kind/email).
  updateMe: (data: SelfProfile) =>
    request<{ user: UserView }>('/auth/me', { method: 'PATCH', ...json(data) }).then((r) => r.user),

  // Active sessions for the signed-in user + "log out everywhere else".
  sessions: () => request<SessionView[]>('/auth/sessions'),
  revokeOtherSessions: () =>
    request<{ revoked: number }>('/auth/sessions/revoke-others', { method: 'POST' }),

  // Verified email change: request mails a link to the NEW address; confirm switches.
  requestEmailChange: (newEmail: string) =>
    request<{ status: string }>('/auth/email-change/request', {
      method: 'POST',
      ...json({ newEmail }),
    }),
  confirmEmailChange: (token: string) =>
    request<{ email: string }>('/auth/email-change/confirm', {
      method: 'POST',
      ...json({ token }),
    }),

  // Telegram channel (per-user). status().enabled is false when the server has no bot token,
  // in which case the UI hides the section entirely.
  telegram: () => request<TelegramStatusView>('/auth/me/telegram'),
  linkTelegram: (chatId: string) =>
    request<void>('/auth/me/telegram', { method: 'PUT', ...json({ chatId }) }),
  unlinkTelegram: () => request<void>('/auth/me/telegram', { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Clients (admin)
// ---------------------------------------------------------------------------

export interface ClientRecord {
  id: string;
  name: string;
  slug: string;
  currency: string;
  notes?: string;
}

export const clients = {
  list: () => request<ClientRecord[]>('/clients'),
  create: (data: CreateClient) =>
    request<ClientRecord>('/clients', { method: 'POST', ...json(data) }),
  get: (id: string) => request<ClientRecord>(`/clients/${id}`),
  update: (id: string, data: UpdateClient) =>
    request<ClientRecord>(`/clients/${id}`, { method: 'PATCH', ...json(data) }),
  delete: (id: string) => request<void>(`/clients/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface ProjectRecord {
  id: string;
  key: string;
  name: string;
  description?: string;
  cadence?: 'sprints' | 'monthly';
  monthlyBudgetMinutes?: number | null;
  monthlyBudgetCents?: number | null;
  clientId?: string | null;
}

export const projects = {
  list: () => request<ProjectRecord[]>('/projects'),
  create: (data: CreateProject) =>
    request<ProjectRecord>('/projects', { method: 'POST', ...json(data) }),
  get: (key: string) => request<ProjectRecord>(`/projects/${key}`),
  update: (key: string, data: UpdateProject) =>
    request<ProjectRecord>(`/projects/${key}`, { method: 'PATCH', ...json(data) }),
  delete: (key: string) => request<void>(`/projects/${key}`, { method: 'DELETE' }),

  statuses: {
    list: (key: string) => request<StatusView[]>(`/projects/${key}/statuses`),
    create: (key: string, data: CreateStatus) =>
      request<StatusView>(`/projects/${key}/statuses`, { method: 'POST', ...json(data) }),
    update: (statusId: string, data: UpdateStatus) =>
      request<StatusView>(`/statuses/${statusId}`, { method: 'PATCH', ...json(data) }),
    delete: (statusId: string) => request<void>(`/statuses/${statusId}`, { method: 'DELETE' }),
  },

  labels: {
    list: (key: string) => request<LabelView[]>(`/projects/${key}/labels`),
    create: (key: string, data: CreateLabel) =>
      request<LabelView>(`/projects/${key}/labels`, { method: 'POST', ...json(data) }),
    delete: (labelId: string) => request<void>(`/labels/${labelId}`, { method: 'DELETE' }),
  },

  board: (key: string) => request<BoardView>(`/projects/${key}/board`),
  backlog: (key: string) => request<IssueView[]>(`/projects/${key}/backlog`),
  summary: (key: string) => request<ProjectSummaryView>(`/projects/${key}/summary`),
  monthly: (key: string, months?: number) =>
    request<ProjectMonthlyView>(`/projects/${key}/monthly${months ? `?months=${months}` : ''}`),

  sprints: {
    list: (key: string) => request<SprintRecord[]>(`/projects/${key}/sprints`),
    create: (key: string, data: CreateSprint) =>
      request<SprintRecord>(`/projects/${key}/sprints`, { method: 'POST', ...json(data) }),
  },
};

// ---------------------------------------------------------------------------
// Sprints
// ---------------------------------------------------------------------------

export interface SprintRecord {
  id: string;
  projectId: string;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  state: 'future' | 'active' | 'closed';
  committedPoints?: number | null;
  completedPoints?: number | null;
  velocity?: VelocityView;
}

export const sprints = {
  update: (id: string, data: UpdateSprint) =>
    request<SprintRecord>(`/sprints/${id}`, { method: 'PATCH', ...json(data) }),
  delete: (id: string) => request<void>(`/sprints/${id}`, { method: 'DELETE' }),
  start: (id: string) => request<SprintRecord>(`/sprints/${id}/start`, { method: 'POST' }),
  close: (id: string) => request<SprintRecord>(`/sprints/${id}/close`, { method: 'POST' }),
};

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export interface CommentRecord {
  id: string;
  issueId: string;
  author: UserView;
  body: string;
  createdAt: string;
  visibility: 'client' | 'internal';
}

/** The client-safe {id, name} projection returned by /issues/:key/mentionable. */
export interface MentionUser {
  id: string;
  name: string;
}

export interface WorklogRecord {
  id: string;
  issueId: string;
  user: UserView;
  minutes: number;
  note: string;
  billable: boolean;
  loggedAt: string;
}

export const issues = {
  list: (filter?: Partial<IssueFilter>) => {
    const params = new URLSearchParams();
    if (filter) {
      for (const [k, v] of Object.entries(filter)) {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
      }
    }
    const qs = params.toString();
    return request<IssueView[]>(`/issues${qs ? `?${qs}` : ''}`);
  },

  create: (data: CreateIssue) => request<IssueView>('/issues', { method: 'POST', ...json(data) }),

  get: (key: string) => request<IssueView>(`/issues/${key}`),

  update: (key: string, data: UpdateIssue) =>
    request<IssueView>(`/issues/${key}`, { method: 'PATCH', ...json(data) }),

  delete: (key: string) => request<void>(`/issues/${key}`, { method: 'DELETE' }),

  move: (key: string, data: MoveIssue) =>
    request<IssueView>(`/issues/${key}/move`, { method: 'POST', ...json(data) }),

  comments: {
    list: (key: string) => request<CommentRecord[]>(`/issues/${key}/comments`),
    create: (key: string, data: CreateComment) =>
      request<CommentRecord>(`/issues/${key}/comments`, { method: 'POST', ...json(data) }),
  },

  /** Users the caller may @mention on this issue (privacy-scoped server-side). */
  mentionable: (key: string) => request<MentionUser[]>(`/issues/${key}/mentionable`),

  worklogs: {
    list: (key: string) => request<WorklogRecord[]>(`/issues/${key}/worklogs`),
    create: (key: string, data: CreateWorklog) =>
      request<WorklogRecord>(`/issues/${key}/worklogs`, { method: 'POST', ...json(data) }),
    update: (id: string, data: UpdateWorklog) =>
      request<WorklogRecord>(`/worklogs/${id}`, { method: 'PATCH', ...json(data) }),
    delete: (id: string) => request<void>(`/worklogs/${id}`, { method: 'DELETE' }),
  },

  cost: (key: string) => request<CostView>(`/issues/${key}/cost`),
  sla: (key: string) => request<SlaView>(`/issues/${key}/sla`),
  events: (key: string) => request<IssueEventView[]>(`/issues/${key}/events`),
  attachments: {
    list: (key: string) => request<AttachmentView[]>(`/issues/${key}/attachments`),
    upload: (key: string, body: CreateAttachment) =>
      request<AttachmentView>(`/issues/${key}/attachments`, { method: 'POST', ...json(body) }),
  },
};

export const attachments = {
  delete: (id: string) => request<void>(`/attachments/${id}`, { method: 'DELETE' }),
  /** Same-origin download URL (cookie sent on navigation; forced as an attachment by the API). */
  url: (id: string) => `${BASE_URL}/attachments/${id}`,
};

// ---------------------------------------------------------------------------
// Period locks (admin) — P1 freeze a client's billed month.
// ---------------------------------------------------------------------------

export const periodLocks = {
  list: (clientId: string) => request<PeriodLockView[]>(`/clients/${clientId}/period-locks`),
  create: (clientId: string, monthKey: string) =>
    request<PeriodLockView>(`/clients/${clientId}/period-locks`, {
      method: 'POST',
      ...json({ monthKey }),
    }),
  delete: (id: string) => request<void>(`/period-locks/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Runbook / KB (staff) — Q1 internal knowledge base.
// ---------------------------------------------------------------------------

export const kb = {
  list: (clientId?: string) =>
    request<KbArticleView[]>(`/kb${clientId ? `?clientId=${clientId}` : ''}`),
  create: (d: CreateKbArticle) => request<KbArticleView>('/kb', { method: 'POST', ...json(d) }),
  update: (id: string, d: UpdateKbArticle) =>
    request<KbArticleView>(`/kb/${id}`, { method: 'PATCH', ...json(d) }),
  delete: (id: string) => request<void>(`/kb/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// SLA policies + attainment (B2) — per-project config + reporting.
// ---------------------------------------------------------------------------

export const sla = {
  policies: (key: string) => request<SlaPolicyView[]>(`/projects/${key}/sla-policies`),
  upsertPolicy: (key: string, d: UpsertSlaPolicy) =>
    request<SlaPolicyView>(`/projects/${key}/sla-policies`, { method: 'PUT', ...json(d) }),
  attainment: (key: string) => request<SlaAttainmentView>(`/projects/${key}/sla/attainment`),
};

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

export const timers = {
  start: (issueKey: string) =>
    request<TimerView>('/timers/start', { method: 'POST', ...json({ issueKey }) }),
  stop: () => request<WorklogRecord>('/timers/stop', { method: 'POST' }),
  active: () => request<TimerView | null>('/timers/active'),
};

// ---------------------------------------------------------------------------
// Rates
// ---------------------------------------------------------------------------

export interface RateRecord {
  id: string;
  scope: 'default' | 'client' | 'project' | 'issue';
  clientId?: string;
  projectId?: string;
  issueId?: string;
  hourlyCents: number;
  currency: string;
}

export const rates = {
  list: () => request<RateRecord[]>('/rates'),
  upsert: (data: UpsertRate) => request<RateRecord>('/rates', { method: 'POST', ...json(data) }),
  delete: (id: string) => request<void>(`/rates/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Notifications & incidents (M3)
// ---------------------------------------------------------------------------

export const incidents = {
  list: (status?: 'open' | 'acked' | 'resolved') =>
    request<IncidentView[]>(`/incidents${status ? `?status=${status}` : ''}`),
  ack: (id: string) => request<IncidentView>(`/incidents/${id}/ack`, { method: 'POST' }),
  resolve: (id: string) => request<IncidentView>(`/incidents/${id}/resolve`, { method: 'POST' }),
};

export const channels = {
  list: () => request<ChannelView[]>('/channels'),
  create: (data: CreateChannel) =>
    request<ChannelView>('/channels', { method: 'POST', ...json(data) }),
  update: (id: string, data: UpdateChannel) =>
    request<ChannelView>(`/channels/${id}`, { method: 'PATCH', ...json(data) }),
  delete: (id: string) => request<void>(`/channels/${id}`, { method: 'DELETE' }),
  test: (id: string) =>
    request<{ ok: boolean; error?: string }>(`/channels/${id}/test`, { method: 'POST' }),
};

// ---------------------------------------------------------------------------
// Inbound integrations (M4)
// ---------------------------------------------------------------------------

export interface AssignmentRuleRecord {
  id: string;
  projectId: string;
  order: number;
  matchType?: string | null;
  matchPriority?: string | null;
  matchLabelId?: string | null;
  assigneeId: string;
}

export const intake = {
  sources: {
    list: () => request<IntakeSourceView[]>('/intake-sources'),
    create: (data: CreateIntakeSource) =>
      request<IntakeSourceView & { token: string; intakeUrl: string }>('/intake-sources', {
        method: 'POST',
        ...json(data),
      }),
    update: (id: string, data: UpdateIntakeSource) =>
      request<IntakeSourceView>(`/intake-sources/${id}`, { method: 'PATCH', ...json(data) }),
    delete: (id: string) => request<void>(`/intake-sources/${id}`, { method: 'DELETE' }),
  },
  rules: {
    list: (key: string) => request<AssignmentRuleRecord[]>(`/projects/${key}/assignment-rules`),
    create: (key: string, data: CreateAssignmentRule) =>
      request<AssignmentRuleRecord>(`/projects/${key}/assignment-rules`, {
        method: 'POST',
        ...json(data),
      }),
    delete: (id: string) => request<void>(`/assignment-rules/${id}`, { method: 'DELETE' }),
  },
};

// ---------------------------------------------------------------------------
// Invoices (M5) — staff billing
// ---------------------------------------------------------------------------

/** Period bounds are ISO date strings (what an <input type="date"> yields). */
export interface GenerateInvoiceInput {
  periodStart?: string;
  periodEnd?: string;
  notes?: string;
}

export const invoices = {
  listForClient: (clientId: string) =>
    request<InvoiceListItemView[]>(`/clients/${clientId}/invoices`),
  generate: (clientId: string, data: GenerateInvoiceInput = {}) =>
    request<InvoiceView>(`/clients/${clientId}/invoices`, { method: 'POST', ...json(data) }),
  get: (id: string) => request<InvoiceView>(`/invoices/${id}`),
  issue: (id: string) => request<InvoiceView>(`/invoices/${id}/issue`, { method: 'POST' }),
  pay: (id: string) => request<InvoiceView>(`/invoices/${id}/pay`, { method: 'POST' }),
  void: (id: string) => request<InvoiceView>(`/invoices/${id}/void`, { method: 'POST' }),
  delete: (id: string) => request<void>(`/invoices/${id}`, { method: 'DELETE' }),
  setExternalRef: (id: string, externalInvoiceRef: string | null) =>
    request<InvoiceView>(`/invoices/${id}/external-ref`, {
      method: 'POST',
      ...json({ externalInvoiceRef }),
    }),
};

// ---------------------------------------------------------------------------
// Portal (M2/M5) — client-facing read-mostly surface
// ---------------------------------------------------------------------------

export const portal = {
  overview: () => request<PortalOverviewView>('/portal'),
  createRequest: (d: CreateRequest) =>
    request<IssueView>('/portal/requests', { method: 'POST', ...json(d) }),
  invoices: () => request<InvoiceListItemView[]>('/portal/invoices'),
  invoice: (id: string) => request<InvoiceView>(`/portal/invoices/${id}`),
};

// ---------------------------------------------------------------------------
// Audit (sauron) — read-only, served by the main API for in-app viewing
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  actorId: string | null;
  actor?: { id: string; name: string } | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  at: string;
}

// ---------------------------------------------------------------------------
// Contracts (admin) — R1 client contracts / SOWs (drive retainer billing).
// ---------------------------------------------------------------------------

export const contracts = {
  list: (clientId?: string) =>
    request<ContractView[]>(`/contracts${clientId ? `?clientId=${clientId}` : ''}`),
  create: (d: CreateContract) =>
    request<ContractView>('/contracts', { method: 'POST', ...json(d) }),
  update: (id: string, d: UpdateContract) =>
    request<ContractView>(`/contracts/${id}`, { method: 'PATCH', ...json(d) }),
  delete: (id: string) => request<void>(`/contracts/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// E1 in-app inbox — the caller's personal notifications.
// ---------------------------------------------------------------------------

export const inbox = {
  list: (unread?: boolean) => request<InboxItemView[]>(`/inbox${unread ? '?unread=true' : ''}`),
  unreadCount: () => request<{ unread: number }>('/inbox/unread-count'),
  markRead: (id: string) => request<InboxItemView>(`/inbox/${id}/read`, { method: 'POST' }),
  markAllRead: () => request<{ marked: number }>('/inbox/read-all', { method: 'POST' }),
};

export const audit = {
  list: (params?: { entityType?: string; entityId?: string; action?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v != null) qs.set(k, String(v));
    const s = qs.toString();
    return request<{ count: number; entries: AuditEntry[] }>(`/audit${s ? `?${s}` : ''}`);
  },
};
