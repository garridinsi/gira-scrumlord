// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-focused cases for BacklogPage. The sibling backlog-page.test.tsx owns the
// happy-path grouping / modal cases; this file is additive and targets the lines that
// suite leaves cold:
//   • BacklogRow rich fields — labels, points/logged units, the due-date pill (overdue
//     and not-overdue), and an assigned vs unassigned avatar.
//   • The `err instanceof ApiError` TRUE side of every mutation toast body (start /
//     close / sprint-create / issue-create / assign): the sibling rejects with a plain
//     Error so only the ': "Error"' side runs. Here we reject with a real ApiError so
//     `err.message` is taken, and we spy on useToast to assert the body precisely.
//   • The assign-success toast that resolves the sprint name (and the "removed" branch).
//   • The CreateSprintModal start/end Date() conversion and both modals' "Creando…"
//     pending label.
//   • The FilterBar-driven `filterResults` override path in the page body.
//   • The `me.data?.id ?? null` fallback when the current user is unknown.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import type { IssueView } from '@gira/shared';
import { renderWithProviders } from './render';

const {
  backlog,
  sprintsList,
  sprintsCreate,
  labelsList,
  usersList,
  issuesList,
  issuesCreate,
  issuesUpdate,
  start,
  close,
  toastSpy,
} = vi.hoisted(() => ({
  backlog: vi.fn(),
  sprintsList: vi.fn(),
  sprintsCreate: vi.fn(),
  labelsList: vi.fn(),
  usersList: vi.fn(),
  issuesList: vi.fn(),
  issuesCreate: vi.fn(),
  issuesUpdate: vi.fn(),
  start: vi.fn(),
  close: vi.fn(),
  toastSpy: vi.fn(),
}));

vi.mock('../api/client', () => ({
  issues: {
    list: (f?: unknown) => issuesList(f),
    create: (b: unknown) => issuesCreate(b),
    update: (k: string, b: unknown) => issuesUpdate(k, b),
  },
  projects: {
    backlog: (k: string) => backlog(k),
    sprints: {
      list: (k: string) => sprintsList(k),
      create: (k: string, b: unknown) => sprintsCreate(k, b),
    },
    labels: { list: (k: string) => labelsList(k) },
  },
  sprints: { start: (id: string) => start(id), close: (id: string) => close(id) },
  users: { list: () => usersList() },
  // Defined INSIDE the factory: vi.mock is hoisted above any top-level class, so referencing
  // an outer `class ApiError` here would hit the temporal dead zone ("cannot access before
  // initialization"). Tests import this back via `import { ApiError }` below.
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown, message: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.body = body;
    }
  },
}));

import { ApiError } from '../api/client';

// Mutable "me" so the `me.data?.id ?? null` fallback can be exercised.
const meState: { data: { id: string; role: string } | undefined } = {
  data: { id: 'u1', role: 'admin' },
};
vi.mock('../hooks/useAuth', () => ({ useMe: () => meState }));
vi.mock('../hooks/useProjectTabs', () => ({ useProjectTabs: () => [] }));
// Spy on toasts so we can assert the mutation body branches precisely.
vi.mock('../ui/Toast', () => ({ useToast: () => toastSpy }));

import { BacklogPage } from '../pages/BacklogPage';

const issue = (over: Partial<IssueView>): IssueView =>
  ({
    id: 'i1',
    key: 'GIRA-1',
    title: 'Backlog item',
    type: 'task',
    priority: 'medium',
    statusId: 's1',
    statusCategory: 'todo',
    status: { id: 's1', name: 'Backlog', category: 'todo', order: 0 },
    labels: [],
    assignee: null,
    reporter: null,
    storyPoints: null,
    estimateMinutes: null,
    dueAt: null,
    billingMode: 'hourly',
    fixedPriceCents: null,
    loggedMinutes: 0,
    sprintId: null,
    createdAt: '2026-06-01T00:00:00Z',
    ...over,
  }) as unknown as IssueView;

interface SprintLike {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  state: 'future' | 'active' | 'closed';
}
const sprint = (over: Partial<SprintLike>): SprintLike => ({
  id: 's1',
  projectId: 'p1',
  name: 'Sprint One',
  goal: null,
  startDate: null,
  endDate: null,
  state: 'future',
  ...over,
});

const renderAt = (key = 'PRJ') =>
  renderWithProviders(
    <Routes>
      <Route path="/projects/:key/backlog" element={<BacklogPage />} />
    </Routes>,
    { route: `/projects/${key}/backlog` },
  );

describe('BacklogPage (coverage)', () => {
  beforeEach(() => {
    meState.data = { id: 'u1', role: 'admin' };
    backlog.mockReset();
    sprintsList.mockReset().mockResolvedValue([]);
    sprintsCreate.mockReset();
    labelsList.mockReset().mockResolvedValue([]);
    usersList.mockReset().mockResolvedValue([]);
    issuesList.mockReset().mockResolvedValue([]);
    issuesCreate.mockReset();
    issuesUpdate.mockReset();
    start.mockReset();
    close.mockReset();
    toastSpy.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── BacklogRow rich fields ──────────────────────────────────────────────────

  it('renders labels, points, logged hours and an overdue due-date pill', async () => {
    backlog.mockResolvedValue([
      issue({
        id: 'i1',
        key: 'GIRA-1',
        title: 'Overdue work',
        sprintId: null,
        // Two labels (slice(0, 2) maps both → LabelChip)
        labels: [
          { id: 'l1', name: 'frontend', color: '#0b1620' },
          { id: 'l2', name: 'backend', color: '#cccccc' },
        ],
        storyPoints: 5,
        loggedMinutes: 90, // → "1.5h"
        // A past due date on a not-done issue → isOverdue true → "!!" marker.
        dueAt: '2020-01-15T00:00:00Z',
        statusCategory: 'todo',
        assignee: { id: 'u9', name: 'Ada Lovelace' },
      }),
    ]);
    renderAt();

    expect(await screen.findByText('Overdue work')).toBeInTheDocument();
    // Labels rendered as chips.
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('backend')).toBeInTheDocument();
    // Story points + logged hours columns.
    expect(screen.getByText('5 pts')).toBeInTheDocument();
    expect(screen.getByText('1.5h')).toBeInTheDocument();
    // Overdue pill renders the "!!" prefix marker.
    expect(screen.getByText(/!!/)).toBeInTheDocument();
    // Assignee avatar (initials of "Ada Lovelace").
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('renders a non-overdue due-date pill (future date, no marker) and a placeholder avatar', async () => {
    backlog.mockResolvedValue([
      issue({
        id: 'i1',
        key: 'GIRA-2',
        title: 'Future due item',
        sprintId: null,
        dueAt: '2999-12-31T00:00:00Z', // far future → not overdue
        statusCategory: 'todo',
        assignee: null, // → dashed placeholder avatar branch
        loggedMinutes: 0, // → "—" logged placeholder
        storyPoints: null, // → "—" points placeholder
      }),
    ]);
    renderAt();

    await screen.findByText('Future due item');
    // The far-future date renders without the "!!" overdue marker.
    expect(screen.queryByText(/!!/)).not.toBeInTheDocument();
    // The formatted year is present in the (non-overdue) due pill.
    expect(screen.getByText(/2999/)).toBeInTheDocument();
  });

  it('does not mark a past due date as overdue when the issue is done', async () => {
    backlog.mockResolvedValue([
      issue({
        id: 'i1',
        key: 'GIRA-3',
        title: 'Done past-due item',
        sprintId: null,
        dueAt: '2020-01-15T00:00:00Z',
        statusCategory: 'done', // isDone → isOverdue stays false
      }),
    ]);
    renderAt();

    await screen.findByText('Done past-due item');
    // isDone short-circuits isOverdue, so no "!!" marker.
    expect(screen.queryByText(/!!/)).not.toBeInTheDocument();
  });

  // ── sprint header Stat unit + loggedMin reduce ──────────────────────────────

  it('renders the sprint header Stats with their pts/h units and the logged-hours total', async () => {
    backlog.mockResolvedValue([
      issue({
        id: 'i1',
        key: 'GIRA-7',
        title: 'In active sprint',
        sprintId: 'sp-active',
        storyPoints: 8,
        loggedMinutes: 150, // loggedMin reduce > 0 → "2.5" hours
      }),
    ]);
    sprintsList.mockResolvedValue([
      sprint({ id: 'sp-active', name: 'Active Sprint', state: 'active', goal: 'ship it' }),
    ]);
    renderAt();

    await screen.findByText('In active sprint');
    // committed pts Stat (value 8) + its "pts" unit span.
    expect(screen.getByText('8')).toBeInTheDocument();
    // logged Stat: loggedMin (150) > 0 → (150/60).toFixed(1) === "2.5".
    expect(screen.getByText('2.5')).toBeInTheDocument();
    // unit spans for the committed / logged stats.
    expect(screen.getByText('pts')).toBeInTheDocument();
    expect(screen.getByText('h')).toBeInTheDocument();
  });

  // ── mutation toast bodies: err instanceof ApiError TRUE side ─────────────────

  it('toasts the ApiError message body when starting a sprint fails', async () => {
    backlog.mockResolvedValue([]);
    sprintsList.mockResolvedValue([sprint({ id: 'sp-future', name: 'Future', state: 'future' })]);
    start.mockRejectedValue(new ApiError(409, {}, 'already active'));
    renderAt();

    await screen.findByText('Future');
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sprint/ }));
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al iniciar sprint · Start failed',
          body: 'already active',
        }),
      ),
    );
  });

  it('toasts the ApiError message body when closing a sprint fails', async () => {
    backlog.mockResolvedValue([]);
    sprintsList.mockResolvedValue([sprint({ id: 'sp-active', name: 'Active', state: 'active' })]);
    close.mockRejectedValue(new ApiError(409, {}, 'cannot close yet'));
    renderAt();

    await screen.findByText('Active');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sprint' }));
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al cerrar sprint · Close failed',
          body: 'cannot close yet',
        }),
      ),
    );
  });

  // ── assign-to-sprint success (sprintName) + ApiError error body ──────────────

  it('toasts the resolved sprint name when an issue is assigned to a sprint', async () => {
    backlog.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-1', title: 'Unscheduled item', sprintId: null }),
    ]);
    sprintsList.mockResolvedValue([sprint({ id: 'sp-future', name: 'Target Sprint' })]);
    issuesUpdate.mockResolvedValue(issue({ key: 'GIRA-1', sprintId: 'sp-future' }));
    renderAt();

    await screen.findByText('Unscheduled item');
    const select = screen.getByRole('combobox', { name: /Asignar a sprint/i });
    await userEvent.selectOptions(select, 'sp-future');

    await waitFor(() =>
      expect(issuesUpdate).toHaveBeenCalledWith('GIRA-1', { sprintId: 'sp-future' }),
    );
    // sprintName resolves → "assigned" success toast with "KEY → name" body.
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'ok',
          title: 'Sprint asignado · Sprint assigned',
          body: 'GIRA-1 → Target Sprint',
        }),
      ),
    );
  });

  it('toasts the "removed" branch when an issue is detached from its sprint', async () => {
    backlog.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-1', title: 'Scheduled item', sprintId: 'sp-future' }),
    ]);
    sprintsList.mockResolvedValue([sprint({ id: 'sp-future', name: 'Some Sprint' })]);
    issuesUpdate.mockResolvedValue(issue({ key: 'GIRA-1', sprintId: null }));
    renderAt();

    await screen.findByText('Scheduled item');
    const select = screen.getAllByRole('combobox', { name: /Asignar a sprint/i })[0]!;
    await userEvent.selectOptions(select, '');

    await waitFor(() => expect(issuesUpdate).toHaveBeenCalledWith('GIRA-1', { sprintId: null }));
    // sprintId === null → no sprintName → "removed" toast keyed off the issue key.
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'ok',
          title: 'Sprint eliminado · Sprint removed',
          body: 'GIRA-1',
        }),
      ),
    );
  });

  it('toasts the ApiError message body when the assign mutation fails', async () => {
    backlog.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-1', title: 'Unscheduled item', sprintId: null }),
    ]);
    sprintsList.mockResolvedValue([sprint({ id: 'sp-future', name: 'Target Sprint' })]);
    issuesUpdate.mockRejectedValue(new ApiError(400, {}, 'assign rejected'));
    renderAt();

    await screen.findByText('Unscheduled item');
    const select = screen.getByRole('combobox', { name: /Asignar a sprint/i });
    await userEvent.selectOptions(select, 'sp-future');

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al asignar sprint · Assign failed',
          body: 'assign rejected',
        }),
      ),
    );
  });

  // ── CreateSprintModal: date conversion + pending label + ApiError body ───────

  it('converts start/end inputs to Date objects on Create Sprint submit', async () => {
    backlog.mockResolvedValue([]);
    sprintsCreate.mockResolvedValue(sprint({ id: 'new-sp', name: 'S-05' }));
    renderAt();

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getByRole('button', { name: '+ Sprint' }));
    await screen.findByText('// NUEVO SPRINT · NEW SPRINT');

    await userEvent.type(screen.getByPlaceholderText('S-05 · Nombre del sprint'), 'S-05');
    // type=date inputs — fireEvent.change is the reliable jsdom path.
    const startInput = screen.getByText('Inicio · Start').parentElement!.querySelector('input')!;
    const endInput = screen.getByText('Fin · End').parentElement!.querySelector('input')!;
    fireEvent.change(startInput, { target: { value: '2026-06-01' } });
    fireEvent.change(endInput, { target: { value: '2026-06-14' } });

    await userEvent.click(screen.getByRole('button', { name: '+ Crear sprint' }));

    await waitFor(() => expect(sprintsCreate).toHaveBeenCalled());
    const [, body] = sprintsCreate.mock.calls[0]!;
    expect((body as { startDate?: Date }).startDate).toBeInstanceOf(Date);
    expect((body as { endDate?: Date }).endDate).toBeInstanceOf(Date);
  });

  it('shows the "Creando…" pending label while a sprint is being created', async () => {
    backlog.mockResolvedValue([]);
    // Never-resolving create keeps mut.isPending true.
    sprintsCreate.mockReturnValue(new Promise(() => {}));
    renderAt();

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getByRole('button', { name: '+ Sprint' }));
    await screen.findByText('// NUEVO SPRINT · NEW SPRINT');

    await userEvent.type(screen.getByPlaceholderText('S-05 · Nombre del sprint'), 'S-09');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear sprint' }));

    expect(await screen.findByText('Creando…')).toBeInTheDocument();
  });

  it('toasts the ApiError message body when sprint creation fails', async () => {
    backlog.mockResolvedValue([]);
    sprintsCreate.mockRejectedValue(new ApiError(422, {}, 'sprint name taken'));
    renderAt();

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getByRole('button', { name: '+ Sprint' }));
    await screen.findByText('// NUEVO SPRINT · NEW SPRINT');

    await userEvent.type(screen.getByPlaceholderText('S-05 · Nombre del sprint'), 'Dupe');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear sprint' }));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al crear sprint · Create failed',
          body: 'sprint name taken',
        }),
      ),
    );
  });

  // ── CreateIssueModal: pending label + Enter-with-empty-title + ApiError body ─

  it('shows the "Creando…" pending label while an issue is being created', async () => {
    backlog.mockResolvedValue([]);
    issuesCreate.mockReturnValue(new Promise(() => {}));
    renderAt();

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getAllByRole('button', { name: '+ Ticket' })[0]!);
    await screen.findByText(/NUEVO TICKET · NEW ISSUE · PRJ/);

    await userEvent.type(screen.getByPlaceholderText('Describe el ticket…'), 'Slow ticket');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear ticket' }));

    expect(await screen.findByText('Creando…')).toBeInTheDocument();
  });

  it('does not submit the Create Issue modal on Enter when the title is blank', async () => {
    backlog.mockResolvedValue([]);
    renderAt();

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getAllByRole('button', { name: '+ Ticket' })[0]!);
    const input = await screen.findByPlaceholderText('Describe el ticket…');
    // Enter with an empty title → `title.trim()` falsy → no create call, modal stays open.
    await userEvent.type(input, '{Enter}');
    expect(issuesCreate).not.toHaveBeenCalled();
    expect(screen.getByText(/NUEVO TICKET · NEW ISSUE · PRJ/)).toBeInTheDocument();
  });

  it('toasts the ApiError message body when issue creation fails', async () => {
    backlog.mockResolvedValue([]);
    issuesCreate.mockRejectedValue(new ApiError(400, {}, 'issue title invalid'));
    renderAt();

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getAllByRole('button', { name: '+ Ticket' })[0]!);
    await screen.findByText(/NUEVO TICKET · NEW ISSUE · PRJ/);

    await userEvent.type(screen.getByPlaceholderText('Describe el ticket…'), 'Bad ticket');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear ticket' }));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al crear · Create failed',
          body: 'issue title invalid',
        }),
      ),
    );
  });

  // ── FilterBar-driven filterResults override ─────────────────────────────────

  it('uses FilterBar results to override the backlog list when a filter is active', async () => {
    // Full backlog has two items; the active filter narrows to just one.
    backlog.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-1', title: 'Apple pie', sprintId: null }),
      issue({ id: 'i2', key: 'GIRA-2', title: 'Banana split', sprintId: null }),
    ]);
    // FilterBar's debounced query returns only the banana item.
    issuesList.mockResolvedValue([issue({ id: 'i2', key: 'GIRA-2', title: 'Banana split' })]);
    renderAt();

    // Both render before any filter is applied.
    expect(await screen.findByText('Apple pie')).toBeInTheDocument();

    // Type into FilterBar search → debounced issues.list → onResults([banana]).
    await userEvent.type(screen.getByLabelText('Buscar tickets · Search issues'), 'banana');
    await waitFor(
      () => expect(issuesList).toHaveBeenCalledWith(expect.objectContaining({ q: 'banana' })),
      { timeout: 2000 },
    );
    // filterResults (non-null) now drives the page: Apple pie drops out, Banana stays.
    await waitFor(() => expect(screen.queryByText('Apple pie')).not.toBeInTheDocument());
    expect(screen.getByText('Banana split')).toBeInTheDocument();
  });

  // ── me.data?.id ?? null fallback ────────────────────────────────────────────

  it('passes null to FilterBar.myId when the current user is unknown', async () => {
    meState.data = undefined; // me.data?.id ?? null → null
    backlog.mockResolvedValue([]);
    renderAt();

    // With myId null the FilterBar still renders (no builtin "assigned to me" pill),
    // and the page reaches the loaded state without throwing on the optional chain.
    await screen.findByText('PENDIENTES');
    expect(screen.getByLabelText('Buscar tickets · Search issues')).toBeInTheDocument();
    expect(screen.queryByText('Asignadas a mí · Assigned to me')).not.toBeInTheDocument();
  });

  // ── URL ?q= search filter (the q ? ... branch, distinct from filterResults) ──

  it('filters by the URL ?q= query when no FilterBar filter is active', async () => {
    backlog.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-1', title: 'Cherry tart', sprintId: null }),
      issue({ id: 'i2', key: 'GIRA-2', title: 'Donut hole', sprintId: null }),
    ]);
    renderWithProviders(
      <Routes>
        <Route path="/projects/:key/backlog" element={<BacklogPage />} />
      </Routes>,
      { route: '/projects/PRJ/backlog?q=cherry' },
    );

    expect(await screen.findByText('Cherry tart')).toBeInTheDocument();
    expect(screen.queryByText('Donut hole')).not.toBeInTheDocument();
  });
});
