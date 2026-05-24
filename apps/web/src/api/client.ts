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
  CreateClient,
  UpdateClient,
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
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as Record<string, unknown>)['message'])
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, body, message);
  }

  return body as T;
}

function json(body: unknown): RequestInit {
  return { body: JSON.stringify(body) };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = {
  list: () => request<UserView[]>('/users'),
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const system = {
  health: () =>
    request<{ status: string; db: boolean; name: string; version: string }>('/health'),
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
    delete: (statusId: string) =>
      request<void>(`/statuses/${statusId}`, { method: 'DELETE' }),
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
  projectKey: string;
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  state: 'future' | 'active' | 'closed';
  committedPoints?: number;
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

  create: (data: CreateIssue) =>
    request<IssueView>('/issues', { method: 'POST', ...json(data) }),

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

  worklogs: {
    list: (key: string) => request<WorklogRecord[]>(`/issues/${key}/worklogs`),
    create: (key: string, data: CreateWorklog) =>
      request<WorklogRecord>(`/issues/${key}/worklogs`, { method: 'POST', ...json(data) }),
  },

  cost: (key: string) => request<CostView>(`/issues/${key}/cost`),
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
  create: (data: CreateChannel) => request<ChannelView>('/channels', { method: 'POST', ...json(data) }),
  update: (id: string, data: UpdateChannel) =>
    request<ChannelView>(`/channels/${id}`, { method: 'PATCH', ...json(data) }),
  delete: (id: string) => request<void>(`/channels/${id}`, { method: 'DELETE' }),
  test: (id: string) => request<{ ok: boolean; error?: string }>(`/channels/${id}/test`, { method: 'POST' }),
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
      request<AssignmentRuleRecord>(`/projects/${key}/assignment-rules`, { method: 'POST', ...json(data) }),
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

export const audit = {
  list: (params?: { entityType?: string; entityId?: string; action?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v != null) qs.set(k, String(v));
    const s = qs.toString();
    return request<{ count: number; entries: AuditEntry[] }>(`/audit${s ? `?${s}` : ''}`);
  },
};
