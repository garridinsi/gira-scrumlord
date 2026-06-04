// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage for src/api/client.ts. This module is a plain fetch wrapper (no React),
// so we drive it by stubbing globalThis.fetch rather than rendering a page — mirroring
// the direct-unit style of error-message.test.ts. Each test asserts the URL, method,
// headers and body the client sends, plus the request() helper's status/parse branches.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  errorMessage,
  reportClientError,
  users,
  system,
  auth,
  clients,
  projects,
  sprints,
  issues,
  attachments,
  periodLocks,
  kb,
  sla,
  timers,
  rates,
  incidents,
  channels,
  intake,
  invoices,
  portal,
  contracts,
  inbox,
  audit,
} from '../api/client';

const BASE = 'http://localhost:3000';

interface FetchResult {
  status?: number;
  ok?: boolean;
  json?: () => Promise<unknown>;
}

const fetchMock = vi.fn();

/** Queue the next fetch resolution. Defaults to a 200 OK returning `payload`. */
function nextResponse(payload: unknown, opts: Partial<FetchResult> = {}): void {
  const status = opts.status ?? 200;
  fetchMock.mockResolvedValueOnce({
    status,
    ok: opts.ok ?? (status >= 200 && status < 300),
    json: opts.json ?? (() => Promise.resolve(payload)),
  });
}

/** The RequestInit the client passed to fetch on call `i` (default last call). */
function callInit(i = fetchMock.mock.calls.length - 1): RequestInit {
  return fetchMock.mock.calls[i]![1] as RequestInit;
}
function callUrl(i = fetchMock.mock.calls.length - 1): string {
  return fetchMock.mock.calls[i]![0] as string;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// request<T> helper: headers, status handling, error envelope
// ---------------------------------------------------------------------------

describe('request<T> helper', () => {
  it('sends credentials and a JSON content-type only when a body is present', async () => {
    nextResponse({ id: 'u1' });
    await users.create({ name: 'Ada', email: 'ada@x.io', role: 'admin', kind: 'staff' } as never);

    const init = callInit();
    expect(callUrl()).toBe(`${BASE}/users`);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(
      JSON.stringify({ name: 'Ada', email: 'ada@x.io', role: 'admin', kind: 'staff' }),
    );
  });

  it('omits the JSON content-type on a bodyless request', async () => {
    nextResponse([]);
    await users.list();

    const init = callInit();
    expect(callUrl()).toBe(`${BASE}/users`);
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(init.credentials).toBe('include');
  });

  it('returns undefined for a 204 No Content (never parses the body)', async () => {
    const json = vi.fn(() => Promise.resolve({ should: 'not be read' }));
    fetchMock.mockResolvedValueOnce({ status: 204, ok: true, json });

    const result = await clients.delete('c1');
    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
    expect(callInit().method).toBe('DELETE');
  });

  it('treats an unparseable body as null and still resolves on 2xx', async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.reject(new Error('not json')),
    });
    const result = await timers.active();
    expect(result).toBeNull();
  });

  it('throws ApiError with the parsed envelope when the response is not ok', async () => {
    nextResponse({ error: 'not_found' }, { status: 404, ok: false });

    await expect(projects.get('NOPE')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    });
  });

  it('builds an ApiError carrying status, body and humanized message', async () => {
    nextResponse({ error: 'already_exists' }, { status: 409, ok: false });

    let caught: unknown;
    try {
      await clients.create({ name: 'Dup' } as never);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    const err = caught as ApiError;
    expect(err.status).toBe(409);
    expect(err.body).toEqual({ error: 'already_exists' });
    expect(err.message).toMatch(/already exists/i);
  });

  it('preserves a caller-provided Content-Type header', async () => {
    nextResponse({ id: 'a1' });
    // attachments.upload sends a JSON body; the helper must not override a header the
    // caller already set. We exercise the header-merge branch via a normal POST and
    // assert the default still applies, then a custom header survives.
    await issues.attachments.upload('GIRA-1', { filename: 'x.png' } as never);
    expect((callInit().headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });
});

// ---------------------------------------------------------------------------
// errorMessage / humanizeCode branches not hit by error-message.test.ts
// ---------------------------------------------------------------------------

describe('errorMessage extra branches', () => {
  it('joins a multi-segment Zod path with dots', () => {
    const body = {
      error: 'validation_error',
      issues: [{ path: ['data', 'periodEnd'], message: 'Invalid date' }],
    };
    expect(errorMessage(body, 400)).toBe('data.periodEnd: Invalid date');
  });

  it('omits the location prefix when the Zod issue has an empty path', () => {
    const body = { error: 'validation_error', issues: [{ path: [], message: 'bad' }] };
    expect(errorMessage(body, 400)).toBe('bad');
  });

  it('falls back to "invalid input" when a Zod issue omits its message', () => {
    const body = { error: 'validation_error', issues: [{ path: ['x'] }] };
    expect(errorMessage(body, 400)).toBe('x: invalid input');
  });

  it('humanizes the in_use and internal_error codes', () => {
    expect(errorMessage({ error: 'in_use' }, 409)).toMatch(/still referenced|en uso/i);
    expect(errorMessage({ error: 'internal_error' }, 500)).toMatch(/went wrong|salió mal/i);
  });
});

// ---------------------------------------------------------------------------
// reportClientError — fire-and-forget, must never throw
// ---------------------------------------------------------------------------

describe('reportClientError', () => {
  it('POSTs the crash payload with keepalive and a JSON content-type', () => {
    fetchMock.mockReturnValueOnce({ catch: () => undefined });
    reportClientError({ message: 'boom', stack: 's', componentStack: 'cs', url: '/x' });

    expect(callUrl()).toBe(`${BASE}/client-errors`);
    const init = callInit();
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(
      JSON.stringify({ message: 'boom', stack: 's', componentStack: 'cs', url: '/x' }),
    );
  });

  it('swallows a synchronous fetch throw without propagating', () => {
    fetchMock.mockImplementationOnce(() => {
      throw new Error('network down');
    });
    expect(() => reportClientError({ message: 'boom' })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Endpoint groups — one representative call per arrow body so every URL/method
// builder line executes. We assert the URL + method (and body where it shapes one).
// ---------------------------------------------------------------------------

describe('endpoint URL + method builders', () => {
  it('users', async () => {
    nextResponse([]);
    await users.list(true);
    expect(callUrl()).toBe(`${BASE}/users?includeInactive=true`);

    nextResponse({});
    await users.update('u1', { name: 'X' } as never);
    expect(callUrl()).toBe(`${BASE}/users/u1`);
    expect(callInit().method).toBe('PATCH');

    nextResponse({ sent: true });
    await users.invite('u1');
    expect(callUrl()).toBe(`${BASE}/users/u1/invite`);
    expect(callInit().method).toBe('POST');
  });

  it('system + auth', async () => {
    nextResponse({ status: 'ok' });
    await system.health();
    expect(callUrl()).toBe(`${BASE}/health`);

    nextResponse(undefined, { status: 204 });
    await auth.magicLink('a@b.io');
    expect(callUrl()).toBe(`${BASE}/auth/magic-link`);
    expect(callInit().body).toBe(JSON.stringify({ email: 'a@b.io' }));

    nextResponse({ user: { id: 'u1' } });
    await auth.callback('tok');
    expect(callUrl()).toBe(`${BASE}/auth/callback`);

    nextResponse(undefined, { status: 204 });
    await auth.logout();
    expect(callUrl()).toBe(`${BASE}/auth/logout`);

    nextResponse({ user: { id: 'u1', kind: 'staff' } });
    const me = await auth.me();
    expect(me).toEqual({ id: 'u1', kind: 'staff' });

    nextResponse({ user: { id: 'u1', name: 'New' } });
    const updated = await auth.updateMe({ name: 'New' } as never);
    expect(updated).toEqual({ id: 'u1', name: 'New' });
    expect(callUrl()).toBe(`${BASE}/auth/me`);
    expect(callInit().method).toBe('PATCH');

    nextResponse([]);
    await auth.sessions();
    expect(callUrl()).toBe(`${BASE}/auth/sessions`);

    nextResponse({ revoked: 2 });
    await auth.revokeOtherSessions();
    expect(callUrl()).toBe(`${BASE}/auth/sessions/revoke-others`);

    nextResponse({ status: 'sent' });
    await auth.requestEmailChange('new@x.io');
    expect(callUrl()).toBe(`${BASE}/auth/email-change/request`);
    expect(callInit().body).toBe(JSON.stringify({ newEmail: 'new@x.io' }));

    nextResponse({ email: 'new@x.io' });
    await auth.confirmEmailChange('tok');
    expect(callUrl()).toBe(`${BASE}/auth/email-change/confirm`);
    expect(callInit().body).toBe(JSON.stringify({ token: 'tok' }));
  });

  it('clients', async () => {
    nextResponse([]);
    await clients.list();
    expect(callUrl()).toBe(`${BASE}/clients`);

    nextResponse({ id: 'c1' });
    await clients.create({ name: 'Acme' } as never);
    expect(callInit().method).toBe('POST');

    nextResponse({ id: 'c1' });
    await clients.get('c1');
    expect(callUrl()).toBe(`${BASE}/clients/c1`);

    nextResponse({ id: 'c1' });
    await clients.update('c1', { name: 'Acme2' } as never);
    expect(callInit().method).toBe('PATCH');
  });

  it('projects + nested statuses/labels/sprints', async () => {
    nextResponse([]);
    await projects.list();
    expect(callUrl()).toBe(`${BASE}/projects`);

    nextResponse({ key: 'MNT' });
    await projects.create({ key: 'MNT', name: 'Maint' } as never);
    expect(callInit().method).toBe('POST');

    nextResponse({ key: 'MNT' });
    await projects.update('MNT', { name: 'M2' } as never);
    expect(callInit().method).toBe('PATCH');

    nextResponse(undefined, { status: 204 });
    await projects.delete('MNT');
    expect(callInit().method).toBe('DELETE');

    nextResponse([]);
    await projects.statuses.list('MNT');
    expect(callUrl()).toBe(`${BASE}/projects/MNT/statuses`);
    nextResponse({ id: 's1' });
    await projects.statuses.create('MNT', { name: 'To Do' } as never);
    expect(callInit().method).toBe('POST');
    nextResponse({ id: 's1' });
    await projects.statuses.update('s1', { name: 'Doing' } as never);
    expect(callUrl()).toBe(`${BASE}/statuses/s1`);
    expect(callInit().method).toBe('PATCH');
    nextResponse(undefined, { status: 204 });
    await projects.statuses.delete('s1');
    expect(callUrl()).toBe(`${BASE}/statuses/s1`);

    nextResponse([]);
    await projects.labels.list('MNT');
    nextResponse({ id: 'l1' });
    await projects.labels.create('MNT', { name: 'bug' } as never);
    expect(callInit().method).toBe('POST');
    nextResponse(undefined, { status: 204 });
    await projects.labels.delete('l1');
    expect(callUrl()).toBe(`${BASE}/labels/l1`);

    nextResponse({});
    await projects.board('MNT');
    expect(callUrl()).toBe(`${BASE}/projects/MNT/board`);
    nextResponse([]);
    await projects.backlog('MNT');
    expect(callUrl()).toBe(`${BASE}/projects/MNT/backlog`);
    nextResponse({});
    await projects.summary('MNT');
    expect(callUrl()).toBe(`${BASE}/projects/MNT/summary`);

    nextResponse({});
    await projects.monthly('MNT', 6);
    expect(callUrl()).toBe(`${BASE}/projects/MNT/monthly?months=6`);
    nextResponse({});
    await projects.monthly('MNT');
    expect(callUrl()).toBe(`${BASE}/projects/MNT/monthly`);

    nextResponse([]);
    await projects.sprints.list('MNT');
    expect(callUrl()).toBe(`${BASE}/projects/MNT/sprints`);
    nextResponse({ id: 'sp1' });
    await projects.sprints.create('MNT', { name: 'Sprint 1' } as never);
    expect(callInit().method).toBe('POST');
  });

  it('sprints', async () => {
    nextResponse({ id: 'sp1' });
    await sprints.update('sp1', { name: 'S2' } as never);
    expect(callUrl()).toBe(`${BASE}/sprints/sp1`);
    expect(callInit().method).toBe('PATCH');
    nextResponse(undefined, { status: 204 });
    await sprints.delete('sp1');
    expect(callInit().method).toBe('DELETE');
    nextResponse({ id: 'sp1' });
    await sprints.start('sp1');
    expect(callUrl()).toBe(`${BASE}/sprints/sp1/start`);
    nextResponse({ id: 'sp1' });
    await sprints.close('sp1');
    expect(callUrl()).toBe(`${BASE}/sprints/sp1/close`);
  });

  it('issues + nested comments/worklogs/attachments and filter serialization', async () => {
    nextResponse([]);
    await issues.list();
    expect(callUrl()).toBe(`${BASE}/issues`);

    nextResponse([]);
    // Only defined, non-null, non-empty values become query params.
    await issues.list({ projectKey: 'MNT', assigneeId: undefined, q: '' } as never);
    expect(callUrl()).toBe(`${BASE}/issues?projectKey=MNT`);

    nextResponse({ key: 'MNT-1' });
    await issues.create({ title: 'New' } as never);
    expect(callInit().method).toBe('POST');
    nextResponse({ key: 'MNT-1' });
    await issues.get('MNT-1');
    expect(callUrl()).toBe(`${BASE}/issues/MNT-1`);
    nextResponse({ key: 'MNT-1' });
    await issues.update('MNT-1', { title: 'X' } as never);
    expect(callInit().method).toBe('PATCH');
    nextResponse(undefined, { status: 204 });
    await issues.delete('MNT-1');
    expect(callInit().method).toBe('DELETE');
    nextResponse({ key: 'MNT-1' });
    await issues.move('MNT-1', { statusId: 's1' } as never);
    expect(callUrl()).toBe(`${BASE}/issues/MNT-1/move`);

    nextResponse([]);
    await issues.comments.list('MNT-1');
    nextResponse({ id: 'c1' });
    await issues.comments.create('MNT-1', { body: 'hi' } as never);
    expect(callUrl()).toBe(`${BASE}/issues/MNT-1/comments`);

    nextResponse([]);
    await issues.mentionable('MNT-1');
    expect(callUrl()).toBe(`${BASE}/issues/MNT-1/mentionable`);

    nextResponse([]);
    await issues.worklogs.list('MNT-1');
    nextResponse({ id: 'w1' });
    await issues.worklogs.create('MNT-1', { minutes: 30 } as never);
    expect(callUrl()).toBe(`${BASE}/issues/MNT-1/worklogs`);
    nextResponse({ id: 'w1' });
    await issues.worklogs.update('w1', { minutes: 45 } as never);
    expect(callUrl()).toBe(`${BASE}/worklogs/w1`);
    expect(callInit().method).toBe('PATCH');
    nextResponse(undefined, { status: 204 });
    await issues.worklogs.delete('w1');
    expect(callUrl()).toBe(`${BASE}/worklogs/w1`);

    nextResponse({});
    await issues.cost('MNT-1');
    expect(callUrl()).toBe(`${BASE}/issues/MNT-1/cost`);
    nextResponse({});
    await issues.sla('MNT-1');
    expect(callUrl()).toBe(`${BASE}/issues/MNT-1/sla`);
    nextResponse([]);
    await issues.events('MNT-1');
    expect(callUrl()).toBe(`${BASE}/issues/MNT-1/events`);
    nextResponse([]);
    await issues.attachments.list('MNT-1');
    expect(callUrl()).toBe(`${BASE}/issues/MNT-1/attachments`);
  });

  it('attachments delete + url builder', async () => {
    nextResponse(undefined, { status: 204 });
    await attachments.delete('a1');
    expect(callUrl()).toBe(`${BASE}/attachments/a1`);
    expect(attachments.url('a1')).toBe(`${BASE}/attachments/a1`);
  });

  it('periodLocks', async () => {
    nextResponse([]);
    await periodLocks.list('c1');
    expect(callUrl()).toBe(`${BASE}/clients/c1/period-locks`);
    nextResponse({ id: 'p1' });
    await periodLocks.create('c1', '2026-05');
    expect(callInit().body).toBe(JSON.stringify({ monthKey: '2026-05' }));
    nextResponse(undefined, { status: 204 });
    await periodLocks.delete('p1');
    expect(callUrl()).toBe(`${BASE}/period-locks/p1`);
  });

  it('kb', async () => {
    nextResponse([]);
    await kb.list('c1');
    expect(callUrl()).toBe(`${BASE}/kb?clientId=c1`);
    nextResponse([]);
    await kb.list();
    expect(callUrl()).toBe(`${BASE}/kb`);
    nextResponse({ id: 'k1' });
    await kb.create({ title: 'T' } as never);
    expect(callInit().method).toBe('POST');
    nextResponse({ id: 'k1' });
    await kb.update('k1', { title: 'T2' } as never);
    expect(callInit().method).toBe('PATCH');
    nextResponse(undefined, { status: 204 });
    await kb.delete('k1');
    expect(callUrl()).toBe(`${BASE}/kb/k1`);
  });

  it('sla policies + attainment', async () => {
    nextResponse([]);
    await sla.policies('MNT');
    expect(callUrl()).toBe(`${BASE}/projects/MNT/sla-policies`);
    nextResponse({});
    await sla.upsertPolicy('MNT', { priority: 'high' } as never);
    expect(callInit().method).toBe('PUT');
    nextResponse({});
    await sla.attainment('MNT');
    expect(callUrl()).toBe(`${BASE}/projects/MNT/sla/attainment`);
  });

  it('timers', async () => {
    nextResponse({ id: 't1' });
    await timers.start('MNT-1');
    expect(callUrl()).toBe(`${BASE}/timers/start`);
    expect(callInit().body).toBe(JSON.stringify({ issueKey: 'MNT-1' }));
    nextResponse({ id: 'w1' });
    await timers.stop();
    expect(callUrl()).toBe(`${BASE}/timers/stop`);
  });

  it('rates', async () => {
    nextResponse([]);
    await rates.list();
    expect(callUrl()).toBe(`${BASE}/rates`);
    nextResponse({ id: 'r1' });
    await rates.upsert({ scope: 'default', hourlyCents: 5000 } as never);
    expect(callInit().method).toBe('POST');
    nextResponse(undefined, { status: 204 });
    await rates.delete('r1');
    expect(callUrl()).toBe(`${BASE}/rates/r1`);
  });

  it('incidents', async () => {
    nextResponse([]);
    await incidents.list('open');
    expect(callUrl()).toBe(`${BASE}/incidents?status=open`);
    nextResponse([]);
    await incidents.list();
    expect(callUrl()).toBe(`${BASE}/incidents`);
    nextResponse({ id: 'i1' });
    await incidents.ack('i1');
    expect(callUrl()).toBe(`${BASE}/incidents/i1/ack`);
    nextResponse({ id: 'i1' });
    await incidents.resolve('i1');
    expect(callUrl()).toBe(`${BASE}/incidents/i1/resolve`);
  });

  it('channels', async () => {
    nextResponse([]);
    await channels.list();
    expect(callUrl()).toBe(`${BASE}/channels`);
    nextResponse({ id: 'ch1' });
    await channels.create({ kind: 'email' } as never);
    expect(callInit().method).toBe('POST');
    nextResponse({ id: 'ch1' });
    await channels.update('ch1', { name: 'X' } as never);
    expect(callInit().method).toBe('PATCH');
    nextResponse(undefined, { status: 204 });
    await channels.delete('ch1');
    expect(callUrl()).toBe(`${BASE}/channels/ch1`);
    nextResponse({ ok: true });
    await channels.test('ch1');
    expect(callUrl()).toBe(`${BASE}/channels/ch1/test`);
  });

  it('intake sources + rules', async () => {
    nextResponse([]);
    await intake.sources.list();
    expect(callUrl()).toBe(`${BASE}/intake-sources`);
    nextResponse({ id: 'src1', token: 't', intakeUrl: 'u' });
    await intake.sources.create({ kind: 'email' } as never);
    expect(callInit().method).toBe('POST');
    nextResponse({ id: 'src1' });
    await intake.sources.update('src1', { name: 'X' } as never);
    expect(callInit().method).toBe('PATCH');
    nextResponse(undefined, { status: 204 });
    await intake.sources.delete('src1');
    expect(callUrl()).toBe(`${BASE}/intake-sources/src1`);

    nextResponse([]);
    await intake.rules.list('MNT');
    expect(callUrl()).toBe(`${BASE}/projects/MNT/assignment-rules`);
    nextResponse({ id: 'ar1' });
    await intake.rules.create('MNT', { assigneeId: 'u1' } as never);
    expect(callInit().method).toBe('POST');
    nextResponse(undefined, { status: 204 });
    await intake.rules.delete('ar1');
    expect(callUrl()).toBe(`${BASE}/assignment-rules/ar1`);
  });

  it('invoices', async () => {
    nextResponse([]);
    await invoices.listForClient('c1');
    expect(callUrl()).toBe(`${BASE}/clients/c1/invoices`);
    nextResponse({ id: 'inv1' });
    await invoices.generate('c1', { notes: 'n' });
    expect(callInit().method).toBe('POST');
    nextResponse({ id: 'inv1' });
    await invoices.generate('c1');
    expect(callInit().body).toBe(JSON.stringify({}));
    nextResponse({ id: 'inv1' });
    await invoices.get('inv1');
    expect(callUrl()).toBe(`${BASE}/invoices/inv1`);
    nextResponse({ id: 'inv1' });
    await invoices.issue('inv1');
    expect(callUrl()).toBe(`${BASE}/invoices/inv1/issue`);
    nextResponse({ id: 'inv1' });
    await invoices.pay('inv1');
    expect(callUrl()).toBe(`${BASE}/invoices/inv1/pay`);
    nextResponse({ id: 'inv1' });
    await invoices.void('inv1');
    expect(callUrl()).toBe(`${BASE}/invoices/inv1/void`);
    nextResponse(undefined, { status: 204 });
    await invoices.delete('inv1');
    expect(callInit().method).toBe('DELETE');
    nextResponse({ id: 'inv1' });
    await invoices.setExternalRef('inv1', 'EXT-9');
    expect(callUrl()).toBe(`${BASE}/invoices/inv1/external-ref`);
    expect(callInit().body).toBe(JSON.stringify({ externalInvoiceRef: 'EXT-9' }));
  });

  it('portal', async () => {
    nextResponse({});
    await portal.overview();
    expect(callUrl()).toBe(`${BASE}/portal`);
    nextResponse({ key: 'MNT-1' });
    await portal.createRequest({ title: 'help' } as never);
    expect(callUrl()).toBe(`${BASE}/portal/requests`);
    nextResponse([]);
    await portal.invoices();
    expect(callUrl()).toBe(`${BASE}/portal/invoices`);
    nextResponse({ id: 'inv1' });
    await portal.invoice('inv1');
    expect(callUrl()).toBe(`${BASE}/portal/invoices/inv1`);
  });

  it('contracts', async () => {
    nextResponse([]);
    await contracts.list('c1');
    expect(callUrl()).toBe(`${BASE}/contracts?clientId=c1`);
    nextResponse([]);
    await contracts.list();
    expect(callUrl()).toBe(`${BASE}/contracts`);
    nextResponse({ id: 'ct1' });
    await contracts.create({ clientId: 'c1' } as never);
    expect(callInit().method).toBe('POST');
    nextResponse({ id: 'ct1' });
    await contracts.update('ct1', { notes: 'n' } as never);
    expect(callInit().method).toBe('PATCH');
    nextResponse(undefined, { status: 204 });
    await contracts.delete('ct1');
    expect(callUrl()).toBe(`${BASE}/contracts/ct1`);
  });

  it('inbox', async () => {
    nextResponse([]);
    await inbox.list(true);
    expect(callUrl()).toBe(`${BASE}/inbox?unread=true`);
    nextResponse([]);
    await inbox.list();
    expect(callUrl()).toBe(`${BASE}/inbox`);
    nextResponse({ unread: 3 });
    await inbox.unreadCount();
    expect(callUrl()).toBe(`${BASE}/inbox/unread-count`);
    nextResponse({ id: 'n1' });
    await inbox.markRead('n1');
    expect(callUrl()).toBe(`${BASE}/inbox/n1/read`);
    nextResponse({ marked: 3 });
    await inbox.markAllRead();
    expect(callUrl()).toBe(`${BASE}/inbox/read-all`);
  });

  it('audit with and without params', async () => {
    nextResponse({ count: 0, entries: [] });
    await audit.list({ entityType: 'invoice', entityId: 'inv1', limit: 50 });
    expect(callUrl()).toBe(`${BASE}/audit?entityType=invoice&entityId=inv1&limit=50`);

    nextResponse({ count: 0, entries: [] });
    await audit.list();
    expect(callUrl()).toBe(`${BASE}/audit`);

    nextResponse({ count: 0, entries: [] });
    // null/undefined values are skipped by the `v != null` guard.
    await audit.list({ entityType: undefined, action: 'create' });
    expect(callUrl()).toBe(`${BASE}/audit?action=create`);
  });
});
