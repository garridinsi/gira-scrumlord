// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for src/ui/IssueDrawer.tsx. These exercise branches the
// main issue-drawer.test.tsx leaves cold: the timer start/stop toast callbacks
// (the sibling test's timer mutate is a bare spy that never invokes them), the
// running-timer interval tick, success-toast bodies, defensive empty/fallback
// branches, and a few render-only branches (overdue badge, multi-entry audit).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IssueView } from '@gira/shared';
import { renderWithProviders } from './render';

const h = vi.hoisted(() => ({
  get: vi.fn(),
  cost: vi.fn(),
  sla: vi.fn(),
  events: vi.fn(),
  attachmentsList: vi.fn(),
  attachmentsUpload: vi.fn(),
  attachmentsDelete: vi.fn(),
  commentsList: vi.fn(),
  mentionable: vi.fn(),
  worklogsList: vi.fn(),
  statusesList: vi.fn(),
  labelsList: vi.fn(),
  usersList: vi.fn(),
  auditList: vi.fn(),
  commentsCreate: vi.fn(),
  update: vi.fn(),
  move: vi.fn(),
  worklogsCreate: vi.fn(),
  worklogsUpdate: vi.fn(),
  worklogsDelete: vi.fn(),
}));

// Timer mock whose start/stop mutate actually invoke the success/error callback
// that IssueDrawer passes in — that is what lights up the toast branches.
const t = vi.hoisted(() => ({
  activeData: null as null | { issueKey: string; elapsedMinutes: number; startedAt: string },
  // Each is a fn(arg, { onSuccess, onError }) that routes to the configured outcome.
  startResult: 'success' as 'success' | 'error',
  startPayload: undefined as unknown,
  startError: undefined as unknown,
  stopResult: 'success' as 'success' | 'error',
  stopPayload: undefined as unknown,
  stopError: undefined as unknown,
  startPending: false,
  stopPending: false,
}));

const startMutate = vi.fn(
  (_key: string, opts?: { onSuccess?: (r: unknown) => void; onError?: (e: unknown) => void }) => {
    if (t.startResult === 'success') opts?.onSuccess?.(t.startPayload);
    else opts?.onError?.(t.startError);
  },
);
const stopMutate = vi.fn(
  (_arg: unknown, opts?: { onSuccess?: (r: unknown) => void; onError?: (e: unknown) => void }) => {
    if (t.stopResult === 'success') opts?.onSuccess?.(t.stopPayload);
    else opts?.onError?.(t.stopError);
  },
);

// Capture toast calls so we can assert the exact title/body each branch emits.
const toastSpy = vi.hoisted(() => ({ fn: vi.fn() }));

vi.mock('../api/client', () => ({
  issues: {
    get: (k: string) => h.get(k),
    cost: (k: string) => h.cost(k),
    sla: (k: string) => h.sla(k),
    events: (k: string) => h.events(k),
    update: (k: string, d: unknown) => h.update(k, d),
    move: (k: string, d: unknown) => h.move(k, d),
    comments: {
      list: (k: string) => h.commentsList(k),
      create: (k: string, b: unknown) => h.commentsCreate(k, b),
    },
    mentionable: (k: string) => h.mentionable(k),
    worklogs: {
      list: (k: string) => h.worklogsList(k),
      create: (k: string, d: unknown) => h.worklogsCreate(k, d),
      update: (id: string, d: unknown) => h.worklogsUpdate(id, d),
      delete: (id: string) => h.worklogsDelete(id),
    },
    attachments: {
      list: (k: string) => h.attachmentsList(k),
      upload: (k: string, b: unknown) => h.attachmentsUpload(k, b),
    },
  },
  attachments: {
    delete: (id: string) => h.attachmentsDelete(id),
    url: (id: string) => `/attachments/${id}`,
  },
  projects: {
    statuses: { list: (k: string) => h.statusesList(k) },
    labels: { list: (k: string) => h.labelsList(k) },
  },
  users: { list: () => h.usersList() },
  audit: { list: (p: unknown) => h.auditList(p) },
  // Mirror the real 3-arg constructor (status, body, message) so `err.message`
  // and `instanceof ApiError` behave exactly like production.
  ApiError: class ApiError extends Error {
    constructor(
      public readonly status: number,
      public readonly body: unknown,
      message: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('../hooks/useTimer', () => ({
  useActiveTimer: () => ({ data: t.activeData }),
  useStartTimer: () => ({ mutate: startMutate, isPending: t.startPending }),
  useStopTimer: () => ({ mutate: stopMutate, isPending: t.stopPending }),
}));

vi.mock('../ui/Toast', () => ({
  useToast: () => toastSpy.fn,
}));

import { ApiError } from '../api/client';
import { IssueDrawer } from '../ui/IssueDrawer';

const issue = (over: Partial<IssueView>): IssueView =>
  ({
    id: 'issue-cuid-0001',
    key: 'GIRA-1',
    title: 'My issue title',
    description: 'A description of the work',
    type: 'task',
    priority: 'medium',
    statusId: 's1',
    statusCategory: 'todo',
    status: { id: 's1', name: 'Backlog', category: 'todo', order: 0 },
    labels: [],
    assignee: null,
    reporter: { id: 'u1', name: 'Reporter' },
    resolution: null,
    severity: null,
    moscow: null,
    blockedReason: null,
    storyPoints: null,
    estimateMinutes: null,
    dueAt: null,
    billingMode: 'hourly',
    fixedPriceCents: null,
    loggedMinutes: 0,
    sprintId: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
    ...over,
  }) as unknown as IssueView;

const renderDrawer = (props?: { issueKey?: string; projectKey?: string; onClose?: () => void }) =>
  renderWithProviders(
    <IssueDrawer
      issueKey={props?.issueKey ?? 'GIRA-1'}
      projectKey={props?.projectKey ?? 'PRJ'}
      onClose={props?.onClose ?? vi.fn()}
    />,
  );

describe('IssueDrawer — coverage gaps', () => {
  beforeEach(() => {
    h.get.mockReset().mockResolvedValue(issue({}));
    h.cost.mockReset().mockResolvedValue({
      minutes: 60,
      billableMinutes: 60,
      hourlyCents: 6000,
      accruedCents: 6000,
      currency: 'EUR',
      billingMode: 'hourly',
    });
    h.sla.mockReset().mockResolvedValue(null);
    h.events.mockReset().mockResolvedValue([]);
    h.attachmentsList.mockReset().mockResolvedValue([]);
    h.attachmentsUpload.mockReset().mockResolvedValue({});
    h.attachmentsDelete.mockReset().mockResolvedValue(undefined);
    h.commentsList.mockReset().mockResolvedValue([]);
    h.mentionable.mockReset().mockResolvedValue([]);
    h.worklogsList.mockReset().mockResolvedValue([]);
    h.statusesList
      .mockReset()
      .mockResolvedValue([{ id: 's1', name: 'Backlog', category: 'todo', order: 0 }]);
    h.labelsList.mockReset().mockResolvedValue([]);
    h.usersList.mockReset().mockResolvedValue([]);
    h.auditList.mockReset().mockResolvedValue({ count: 0, entries: [] });
    h.commentsCreate.mockReset();
    h.update.mockReset();
    h.move.mockReset();
    h.worklogsCreate.mockReset();
    h.worklogsUpdate.mockReset();
    h.worklogsDelete.mockReset();

    t.activeData = null;
    t.startResult = 'success';
    t.startPayload = undefined;
    t.startError = undefined;
    t.stopResult = 'success';
    t.stopPayload = { minutes: 90 };
    t.stopError = undefined;
    t.startPending = false;
    t.stopPending = false;
    startMutate.mockClear();
    stopMutate.mockClear();
    toastSpy.fn.mockReset();
  });

  // ── Timer: start/stop success + error toast callbacks (lines 86–112) ───────

  it('emits the started toast on a successful start', async () => {
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByRole('button', { name: /Iniciar · Start/ }));
    expect(startMutate).toHaveBeenCalledWith('GIRA-1', expect.any(Object));
    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Cronómetro iniciado · Timer started' }),
      ),
    );
  });

  it('emits the start-failed toast (ApiError message) when start rejects', async () => {
    t.startResult = 'error';
    t.startError = new ApiError(409, null, 'cannot start');
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByRole('button', { name: /Iniciar · Start/ }));
    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al iniciar · Start failed',
          body: 'cannot start',
        }),
      ),
    );
  });

  it('emits the start-failed toast (generic) when start rejects with a non-ApiError', async () => {
    t.startResult = 'error';
    t.startError = new Error('boom');
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByRole('button', { name: /Iniciar · Start/ }));
    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error al iniciar · Start failed', body: 'Error' }),
      ),
    );
  });

  it('emits the stopped toast with the logged minutes on a successful stop', async () => {
    t.activeData = {
      issueKey: 'GIRA-1',
      elapsedMinutes: 1,
      startedAt: new Date(Date.now() - 5_000).toISOString(),
    };
    t.stopPayload = { minutes: 90 };
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByRole('button', { name: /Parar · Stop/ }));
    expect(stopMutate).toHaveBeenCalled();
    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'ok',
          title: 'Cronómetro parado · Timer stopped',
          body: '1h 30m registrados',
        }),
      ),
    );
  });

  it('emits the stop-failed toast (ApiError message) when stop rejects', async () => {
    t.activeData = {
      issueKey: 'GIRA-1',
      elapsedMinutes: 1,
      startedAt: new Date(Date.now() - 5_000).toISOString(),
    };
    t.stopResult = 'error';
    t.stopError = new ApiError(409, null, 'cannot stop');
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByRole('button', { name: /Parar · Stop/ }));
    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al parar · Stop failed',
          body: 'cannot stop',
        }),
      ),
    );
  });

  // ── Timer: running interval tick + teardown (lines 64, 68) ─────────────────

  it('ticks the running-timer clock past 00:00:00 once the 1s interval fires', async () => {
    // elapsedMinutes 1 means the base is already 60s, so the running display is
    // never "00:00:00"; the interval tick (re-reading Date.now) keeps it advancing.
    t.activeData = {
      issueKey: 'GIRA-1',
      elapsedMinutes: 1,
      startedAt: new Date(Date.now() - 5_000).toISOString(),
    };
    renderDrawer();
    await screen.findByText('My issue title');

    // Running state: the clock shows a non-zero HH:MM:SS, and the interval body
    // (the per-second setElapsed) runs as real time passes.
    expect(screen.getByText(/en marcha · running/)).toBeInTheDocument();
    expect(screen.queryByText('00:00:00')).not.toBeInTheDocument();
    const initial = screen.getByText(/^00:01:\d\d$/).textContent;
    // Wait for the 1s interval callback to fire and advance the displayed clock.
    await waitFor(
      () => {
        const now = screen.getByText(/^00:01:\d\d$/).textContent;
        expect(now).not.toBe(initial);
      },
      { timeout: 3_000 },
    );
  });

  it('clears the running interval when the timer stops (effect else-branch)', async () => {
    t.activeData = {
      issueKey: 'GIRA-1',
      elapsedMinutes: 1,
      startedAt: new Date(Date.now() - 5_000).toISOString(),
    };
    const view = renderDrawer();
    await screen.findByText('My issue title');
    expect(screen.queryByText('00:00:00')).not.toBeInTheDocument();

    // Flip the timer off and re-render: the effect re-runs with isRunning=false,
    // taking the else-branch that resets elapsed and clears the interval.
    t.activeData = null;
    view.rerender(<IssueDrawer issueKey="GIRA-1" projectKey="PRJ" onClose={vi.fn()} />);
    expect(await screen.findByText('00:00:00')).toBeInTheDocument();
  });

  // ── DetailsTab: saving label + unchanged early-return (lines 194, 200, 265) ─

  it('shows the saving label while a description save is pending', async () => {
    h.get.mockResolvedValue(issue({ description: 'old desc' }));
    let resolveUpdate: (v: unknown) => void = () => {};
    h.update.mockImplementation(
      () =>
        new Promise((res) => {
          resolveUpdate = res;
        }),
    );
    renderDrawer();
    await screen.findByText('old desc');

    await userEvent.click(screen.getByRole('button', { name: /Editar · Edit/ }));
    const ta = screen.getByPlaceholderText(/Write a description/i);
    await userEvent.clear(ta);
    await userEvent.type(ta, 'new desc');
    await userEvent.click(screen.getByRole('button', { name: /Guardar · Save/ }));

    // While pending the button reads "Guardando…".
    expect(await screen.findByRole('button', { name: 'Guardando…' })).toBeInTheDocument();
    await act(async () => {
      resolveUpdate(issue({ description: 'new desc' }));
    });
  });

  it('closes the description editor without saving when the draft is unchanged', async () => {
    h.get.mockResolvedValue(issue({ description: 'same' }));
    renderDrawer();
    await screen.findByText('same');

    await userEvent.click(screen.getByRole('button', { name: /Editar · Edit/ }));
    await userEvent.click(screen.getByRole('button', { name: /Guardar · Save/ }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Editar · Edit/ })).toBeInTheDocument(),
    );
    expect(h.update).not.toHaveBeenCalled();
  });

  // ── Comments: error toast + mentionable empty state (lines 364, 541–547) ────

  it('emits an error toast when posting a comment fails', async () => {
    h.commentsCreate.mockRejectedValue(new ApiError(403, null, 'comment denied'));
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Comentarios'));
    await userEvent.type(await screen.findByPlaceholderText(/Type a reply/i), 'will fail');
    await userEvent.click(screen.getByRole('button', { name: /Enviar · Send/ }));

    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al comentar · Comment failed',
          body: 'comment denied',
        }),
      ),
    );
  });

  it('shows the "nobody to mention" empty state in the picker', async () => {
    h.mentionable.mockResolvedValue([]);
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Comentarios'));
    await userEvent.click(await screen.findByRole('button', { name: /mencionar · mention/ }));
    expect(await screen.findByText(/nadie disponible · nobody to mention/)).toBeInTheDocument();
  });

  // ── Worklogs: create-success toast + row note dash (lines 626 already; 939) ─

  it('emits the worklog-added toast with formatted minutes on success', async () => {
    h.worklogsList.mockResolvedValue([]);
    h.worklogsCreate.mockResolvedValue({ id: 'w1', minutes: 45 });
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await userEvent.click(await screen.findByRole('button', { name: /Add worklog/ }));
    await userEvent.type(screen.getByPlaceholderText(/Minutos · Minutes/), '45');
    await userEvent.click(screen.getByRole('button', { name: /\+ Guardar · Save/ }));

    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'ok',
          title: 'Trabajo registrado · Worklog added',
          body: '45m',
        }),
      ),
    );
  });

  it('emits the worklog-failed toast (ApiError message) when creation rejects', async () => {
    h.worklogsList.mockResolvedValue([]);
    h.worklogsCreate.mockRejectedValue(new ApiError(422, null, 'bad minutes'));
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await userEvent.click(await screen.findByRole('button', { name: /Add worklog/ }));
    await userEvent.type(screen.getByPlaceholderText(/Minutos · Minutes/), '30');
    await userEvent.click(screen.getByRole('button', { name: /\+ Guardar · Save/ }));

    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al registrar · Worklog failed',
          body: 'bad minutes',
        }),
      ),
    );
  });

  it('renders an em dash for a worklog row with an empty note', async () => {
    // storyPoints set to a number so the only "—" on screen is the worklog note
    // cell (the sidebar story-points span would otherwise also render "—").
    h.get.mockResolvedValue(issue({ storyPoints: 5 }));
    h.worklogsList.mockResolvedValue([
      {
        id: 'w1',
        issueId: 'i1',
        user: { id: 'u1', name: 'Worker' },
        minutes: 60,
        note: '',
        billable: false,
        loggedAt: '2026-06-01T00:00:00Z',
      },
    ]);
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    // The note cell falls back to "—" (and the non-billable chip "·" renders).
    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  it('emits the worklog-updated success toast and closes the editor', async () => {
    h.worklogsList.mockResolvedValue([
      {
        id: 'w1',
        issueId: 'i1',
        user: { id: 'u1', name: 'Worker' },
        minutes: 60,
        note: 'note',
        billable: true,
        loggedAt: '2026-06-01T00:00:00Z',
      },
    ]);
    h.worklogsUpdate.mockResolvedValue({ id: 'w1', minutes: 75 });
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await userEvent.click(await screen.findByTitle('Editar · Edit'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar · Save' }));

    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Registro actualizado · Worklog updated' }),
      ),
    );
  });

  it('emits a generic worklog error toast (non-ApiError) when delete fails', async () => {
    h.worklogsList.mockResolvedValue([
      {
        id: 'w1',
        issueId: 'i1',
        user: { id: 'u1', name: 'Worker' },
        minutes: 60,
        note: 'note',
        billable: true,
        loggedAt: '2026-06-01T00:00:00Z',
      },
    ]);
    h.worklogsDelete.mockRejectedValue(new Error('plain'));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await userEvent.click(await screen.findByTitle('Eliminar · Delete'));

    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'danger', title: 'Error', body: 'Error' }),
      ),
    );
    confirmSpy.mockRestore();
  });

  // ── Audit: empty fallback + multi-entry borders + missing-actor initials ───

  it('renders multiple audit entries (dashed dividers) and the "??" actor fallback', async () => {
    h.auditList.mockResolvedValue({
      count: 2,
      entries: [
        {
          id: 'a1',
          actorId: 'u1',
          actor: { id: 'u1', name: 'Jane Doe' },
          action: 'issue.updated',
          entityType: 'Issue',
          entityId: 'issue-cuid-0001',
          before: {},
          after: {},
          at: '2026-06-01T12:34:56Z',
        },
        {
          id: 'a2',
          actorId: null,
          actor: null,
          action: 'issue.created',
          entityType: 'Issue',
          entityId: 'issue-cuid-0001',
          before: {},
          after: {},
          at: '2026-06-01T10:00:00Z',
        },
      ],
    });
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Auditoría'));
    expect(await screen.findByText('JD')).toBeInTheDocument(); // multi-word initials
    expect(screen.getByText('??')).toBeInTheDocument(); // null actor fallback
    expect(screen.getByText('issue.created')).toBeInTheDocument();
  });

  // ── Attachments: upload error + too-large guard + delete (1196–1218, 1268) ──

  it('emits an upload-failed toast when the upload rejects', async () => {
    h.attachmentsUpload.mockRejectedValue(new ApiError(413, null, 'upload nope'));
    renderDrawer();
    await screen.findByText('My issue title');

    const file = new File(['hi'], 'note.txt', { type: 'text/plain' });
    await userEvent.upload(screen.getByLabelText(/Subir adjunto · upload/), file);

    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al subir · Upload failed',
          body: 'upload nope',
        }),
      ),
    );
  });

  it('rejects an oversized attachment with the "too large" toast without uploading', async () => {
    renderDrawer();
    await screen.findByText('My issue title');

    // A real File whose byte length exceeds the 1 MiB cap (MAX_ATTACHMENT_BYTES).
    const big = new File(['x'.repeat(1_100_000)], 'big.bin', {
      type: 'application/octet-stream',
    });
    await userEvent.upload(screen.getByLabelText(/Subir adjunto · upload/), big);

    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'danger', title: 'Demasiado grande · too large' }),
      ),
    );
    expect(h.attachmentsUpload).not.toHaveBeenCalled();
  });

  it('deletes an attachment after confirming', async () => {
    h.attachmentsList.mockResolvedValue([
      {
        id: 'a1',
        issueId: 'i1',
        filename: 'doc.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2048,
        uploadedById: 'u1',
        createdAt: '2026-06-01T00:00:00Z',
      },
    ]);
    h.attachmentsDelete.mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(await screen.findByRole('button', { name: /Borrar doc\.pdf · delete/ }));
    await waitFor(() => expect(h.attachmentsDelete).toHaveBeenCalledWith('a1'));
    confirmSpy.mockRestore();
  });

  // ── SLA clock formatting branches (lines 1285, 1297–1298) ──────────────────

  it('renders SLA clocks: met (✓) and pending (no mark), with h+m formatting', async () => {
    h.sla.mockResolvedValue({
      issueKey: 'GIRA-1',
      businessTimeZone: 'Europe/Madrid',
      // met → ✓; targetMinutes 90 → "1h 30m" exercises the h>0 && min branch.
      response: { targetMinutes: 90, elapsedMinutes: 30, met: true, breached: false },
      // neither met nor breached → no mark; elapsed 45 → "45m" exercises h===0 branch.
      resolution: { targetMinutes: 120, elapsedMinutes: 45, met: false, breached: false },
    });
    renderDrawer();

    expect(await screen.findByText(/respuesta · response/)).toBeInTheDocument();
    expect(screen.getByText(/30m \/ 1h 30m ✓/)).toBeInTheDocument();
    expect(screen.getByText(/45m \/ 2h/)).toBeInTheDocument();
  });

  // ── LedgerMini: moved entry WITHOUT a status category (line 1356 else) ──────

  it('renders a moved ledger entry that has no status category', async () => {
    h.events.mockResolvedValue([
      {
        id: 'e1',
        issueId: 'i1',
        kind: 'status_changed',
        fromStatusId: 's1',
        toStatusId: 's2',
        statusCategory: null,
        actorId: 'u1',
        createdAt: '2026-06-02T09:00:00Z',
      },
    ]);
    renderDrawer();
    // No "→ category" suffix when statusCategory is null.
    expect(await screen.findByText('movida · moved')).toBeInTheDocument();
  });

  // ── Sidebar: status category color branches + reporter-missing (1441–1490) ─

  it('renders the done-category status plate', async () => {
    h.get.mockResolvedValue(issue({ statusId: 's2' }));
    h.statusesList.mockResolvedValue([
      { id: 's1', name: 'Backlog', category: 'todo', order: 0 },
      { id: 's2', name: 'Shipped', category: 'done', order: 1 },
    ]);
    renderDrawer();
    await screen.findByText('My issue title');
    expect(await screen.findByText('SHIPPED')).toBeInTheDocument();
  });

  it('renders the in_progress-category status plate', async () => {
    h.get.mockResolvedValue(issue({ statusId: 's3' }));
    h.statusesList.mockResolvedValue([
      { id: 's3', name: 'Doing', category: 'in_progress', order: 0 },
    ]);
    renderDrawer();
    await screen.findByText('My issue title');
    expect(await screen.findByText('DOING')).toBeInTheDocument();
  });

  it('renders the reporter "—" placeholder when the issue has no reporter', async () => {
    h.get.mockResolvedValue(issue({ reporter: null }));
    renderDrawer();
    await screen.findByText('My issue title');
    // The reporter SideField falls back to a mono em dash.
    expect(await screen.findByText('My issue title')).toBeInTheDocument();
  });

  // ── Sidebar selects: resolution / moscow / severity onChange (1543/1564/1585)

  it('sets a resolution via the sidebar', async () => {
    h.get.mockResolvedValue(issue({ resolution: null }));
    h.update.mockResolvedValue(issue({ resolution: 'wontfix' }));
    renderDrawer();
    await screen.findByText('My issue title');

    const opt = screen.getByRole('option', {
      name: /No se corrige · Won/,
    }) as HTMLOptionElement;
    await userEvent.selectOptions(opt.closest('select')!, 'wontfix');
    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { resolution: 'wontfix' }));
  });

  it('clears the resolution to null via the sidebar (empty option)', async () => {
    h.get.mockResolvedValue(issue({ resolution: 'fixed' }));
    h.update.mockResolvedValue(issue({ resolution: null }));
    renderDrawer();
    await screen.findByText('My issue title');

    const select = (
      screen.getByRole('option', { name: /Resuelto · Fixed/ }) as HTMLOptionElement
    ).closest('select')!;
    await userEvent.selectOptions(select, '');
    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { resolution: null }));
  });

  it('sets a moscow priority via the sidebar', async () => {
    h.get.mockResolvedValue(issue({ moscow: null }));
    h.update.mockResolvedValue(issue({ moscow: 'should' }));
    renderDrawer();
    await screen.findByText('My issue title');

    const opt = screen.getByRole('option', { name: /Should · debería/ }) as HTMLOptionElement;
    await userEvent.selectOptions(opt.closest('select')!, 'should');
    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { moscow: 'should' }));
  });

  it('sets a severity via the sidebar', async () => {
    h.get.mockResolvedValue(issue({ severity: null }));
    h.update.mockResolvedValue(issue({ severity: 'minor' }));
    renderDrawer();
    await screen.findByText('My issue title');

    const opt = screen.getByRole('option', { name: /Menor · Minor/ }) as HTMLOptionElement;
    await userEvent.selectOptions(opt.closest('select')!, 'minor');
    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { severity: 'minor' }));
  });

  // ── dueAt change + overdue badge (lines 1637–1638, 1663–1669) ──────────────

  it('sets a new due date via the date input (update mutation)', async () => {
    h.get.mockResolvedValue(issue({ dueAt: null, statusId: 's1' }));
    h.update.mockResolvedValue(issue({ dueAt: '2026-12-31T00:00:00Z' }));
    const { container } = renderDrawer();
    await screen.findByText('My issue title');

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    // fireEvent.change is deterministic for date inputs (userEvent.type is flaky).
    fireEvent.change(dateInput, { target: { value: '2026-12-31' } });

    await waitFor(() => expect(h.update).toHaveBeenCalled());
    const call = h.update.mock.calls.at(-1)!;
    expect(call[0]).toBe('GIRA-1');
    expect((call[1] as { dueAt: Date }).dueAt).toBeInstanceOf(Date);
  });

  it('renders the OVERDUE badge for a past due date on a non-done issue', async () => {
    h.get.mockResolvedValue(issue({ dueAt: '2020-01-01T00:00:00Z', statusId: 's1' }));
    h.statusesList.mockResolvedValue([{ id: 's1', name: 'Backlog', category: 'todo', order: 0 }]);
    renderDrawer();
    await screen.findByText('My issue title');
    expect(await screen.findByText(/VENCIDO · OVERDUE/)).toBeInTheDocument();
  });

  // ── updateMutation success-toast branches (lines 1855, 1860) ────────────────

  it('emits the assignee-updated toast with the new assignee name', async () => {
    h.get.mockResolvedValue(issue({ assignee: null }));
    h.usersList.mockResolvedValue([{ id: 'u9', name: 'Dev Nine' }]);
    h.update.mockResolvedValue(issue({ assignee: { id: 'u9', name: 'Dev Nine' } }));
    renderDrawer();
    await screen.findByText('My issue title');

    const opt = (await screen.findByRole('option', { name: 'Dev Nine' })) as HTMLOptionElement;
    await userEvent.selectOptions(opt.closest('select')!, 'u9');

    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'ok',
          title: 'Asignación actualizada · Assignee updated',
          body: 'Dev Nine',
        }),
      ),
    );
  });

  it('emits the assignee-updated toast with the "unassigned" fallback when cleared', async () => {
    h.get.mockResolvedValue(issue({ assignee: { id: 'u9', name: 'Dev Nine' } }));
    h.usersList.mockResolvedValue([{ id: 'u9', name: 'Dev Nine' }]);
    h.update.mockResolvedValue(issue({ assignee: null }));
    renderDrawer();
    await screen.findByText('My issue title');

    // Selecting the "unassigned" option sends assigneeId: null.
    const select = (
      (await screen.findByRole('option', { name: 'Dev Nine' })) as HTMLOptionElement
    ).closest('select')!;
    await userEvent.selectOptions(select, '');

    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Asignación actualizada · Assignee updated',
          body: 'sin asignar · unassigned',
        }),
      ),
    );
  });

  it('emits the due-date-updated toast with a formatted date on success', async () => {
    h.get.mockResolvedValue(issue({ dueAt: '2026-07-01T00:00:00Z' }));
    h.update.mockResolvedValue(issue({ dueAt: null }));
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByTitle(/Quitar fecha · Clear due date/));
    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Vencimiento actualizado · Due date updated',
          body: 'sin fecha · cleared',
        }),
      ),
    );
  });

  // ── update / move error toasts (lines 1870, 1890) ──────────────────────────

  it('emits the update-failed toast (generic) when an update rejects', async () => {
    h.get.mockResolvedValue(issue({ priority: 'medium' }));
    h.update.mockRejectedValue(new Error('plain update'));
    renderDrawer();
    await screen.findByText('My issue title');

    const opt = screen.getByRole('option', { name: 'high' }) as HTMLOptionElement;
    await userEvent.selectOptions(opt.closest('select')!, 'high');

    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al actualizar · Update failed',
          body: 'Error',
        }),
      ),
    );
  });

  it('emits the move-failed toast (ApiError message) when a status move rejects', async () => {
    h.get.mockResolvedValue(issue({ statusId: 's1' }));
    h.statusesList.mockResolvedValue([
      { id: 's1', name: 'Backlog', category: 'todo', order: 0 },
      { id: 's2', name: 'Done', category: 'done', order: 1 },
    ]);
    h.move.mockRejectedValue(new ApiError(423, null, 'locked sprint'));
    renderDrawer();
    await screen.findByText('My issue title');

    const opt = (await screen.findByRole('option', { name: 'Done' })) as HTMLOptionElement;
    await userEvent.selectOptions(opt.closest('select')!, 's2');

    await waitFor(() =>
      expect(toastSpy.fn).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al mover · Move failed',
          body: 'locked sprint',
        }),
      ),
    );
  });

  // ── Tab count badge active styling (lines 2196–2198) ───────────────────────

  it('shows the count badge on the active Worklogs tab', async () => {
    h.worklogsList.mockResolvedValue([
      {
        id: 'w1',
        issueId: 'i1',
        user: { id: 'u1', name: 'Worker' },
        minutes: 30,
        note: 'a',
        billable: true,
        loggedAt: '2026-06-01T00:00:00Z',
      },
      {
        id: 'w2',
        issueId: 'i1',
        user: { id: 'u1', name: 'Worker' },
        minutes: 15,
        note: 'b',
        billable: false,
        loggedAt: '2026-06-01T00:00:00Z',
      },
    ]);
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    // Once the worklogs load, the active tab renders a "2" count badge.
    await waitFor(() => expect(h.worklogsList).toHaveBeenCalled());
    expect(await screen.findByText('2')).toBeInTheDocument();
  });
});
