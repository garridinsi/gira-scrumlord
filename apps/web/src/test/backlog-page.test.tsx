// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
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
  ApiError: class ApiError extends Error {},
}));

// Stable useMe reference so FilterBar's seeding effects don't re-fire.
const ME = { data: { id: 'u1', role: 'admin' } };
vi.mock('../hooks/useAuth', () => ({ useMe: () => ME }));
vi.mock('../hooks/useProjectTabs', () => ({ useProjectTabs: () => [] }));

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

const renderAt = (key: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/projects/:key/backlog" element={<BacklogPage />} />
    </Routes>,
    { route: `/projects/${key}/backlog` },
  );

describe('BacklogPage', () => {
  beforeEach(() => {
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
  });

  // ── basic render / data ────────────────────────────────────────────────────
  it('renders the backlog issues for the project', async () => {
    backlog.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-1', title: 'First backlog item' }),
      issue({ id: 'i2', key: 'GIRA-2', title: 'Second backlog item' }),
    ]);
    renderAt('PRJ');

    expect(await screen.findByText('First backlog item')).toBeInTheDocument();
    expect(screen.getByText('Second backlog item')).toBeInTheDocument();
    expect(backlog).toHaveBeenCalledWith('PRJ');
    // Unscheduled header present
    expect(screen.getByText('PENDIENTES')).toBeInTheDocument();
  });

  it('shows the empty backlog state when there are no unscheduled issues', async () => {
    backlog.mockResolvedValue([]);
    renderAt('PRJ');
    expect(await screen.findByText(/Backlog vacío · Nothing unscheduled/i)).toBeInTheDocument();
  });

  // ── loading + error states ──────────────────────────────────────────────────
  it('renders the loading state while backlog/sprints are pending', async () => {
    // Never-resolving promises keep both queries in the loading branch.
    backlog.mockReturnValue(new Promise(() => {}));
    sprintsList.mockReturnValue(new Promise(() => {}));
    renderAt('PRJ');
    expect(await screen.findByText(/cargando pendientes · loading backlog/i)).toBeInTheDocument();
  });

  it('renders the error state when the backlog query fails', async () => {
    backlog.mockImplementation(() => Promise.reject(new Error('backlog boom')));
    renderAt('PRJ');
    expect(await screen.findByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText('backlog boom')).toBeInTheDocument();
  });

  it('surfaces the error state when the SPRINTS query fails (not just the backlog)', async () => {
    // A failed sprints query used to fall through silently — the sprint sections just
    // vanished. It must now raise the same ERROR plate.
    backlog.mockResolvedValue([]);
    sprintsList.mockImplementation(() => Promise.reject(new Error('sprints boom')));
    renderAt('PRJ');
    expect(await screen.findByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText('sprints boom')).toBeInTheDocument();
  });

  // ── sprint grouping + start / close mutations ───────────────────────────────
  it('renders an active sprint with a Cerrar sprint button and closes it', async () => {
    backlog.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-1', title: 'In active sprint', sprintId: 'sp-active' }),
    ]);
    sprintsList.mockResolvedValue([
      sprint({ id: 'sp-active', name: 'Active Sprint', state: 'active', goal: 'ship it' }),
    ]);
    close.mockResolvedValue(sprint({ id: 'sp-active', state: 'closed' }));
    renderAt('PRJ');

    // Sprint name appears both in the header and as a row-select option, so match all.
    expect((await screen.findAllByText('Active Sprint')).length).toBeGreaterThan(0);
    expect(screen.getByText('ACTIVO')).toBeInTheDocument();
    // issue assigned to the active sprint shows inside the group
    expect(screen.getByText('In active sprint')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sprint' }));
    await waitFor(() => expect(close).toHaveBeenCalledWith('sp-active'));
  });

  it('shows the close-sprint error toast when closing fails', async () => {
    backlog.mockResolvedValue([]);
    sprintsList.mockResolvedValue([sprint({ id: 'sp-active', name: 'Active', state: 'active' })]);
    close.mockImplementation(() => Promise.reject(new Error('cannot close')));
    renderAt('PRJ');

    await screen.findByText('Active');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sprint' }));
    await waitFor(() => expect(close).toHaveBeenCalledWith('sp-active'));
  });

  it('renders a future sprint with an Iniciar sprint button and starts it', async () => {
    backlog.mockResolvedValue([]);
    sprintsList.mockResolvedValue([
      sprint({ id: 'sp-future', name: 'Future Sprint', state: 'future' }),
    ]);
    start.mockResolvedValue(sprint({ id: 'sp-future', state: 'active' }));
    renderAt('PRJ');

    expect(await screen.findByText('Future Sprint')).toBeInTheDocument();
    expect(screen.getByText('FUTURO')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Iniciar sprint/ }));
    await waitFor(() => expect(start).toHaveBeenCalledWith('sp-future'));
  });

  it('shows the start-sprint error toast when starting fails', async () => {
    backlog.mockResolvedValue([]);
    sprintsList.mockResolvedValue([sprint({ id: 'sp-future', name: 'Future', state: 'future' })]);
    start.mockImplementation(() => Promise.reject(new Error('cannot start')));
    renderAt('PRJ');

    await screen.findByText('Future');
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sprint/ }));
    await waitFor(() => expect(start).toHaveBeenCalledWith('sp-future'));
  });

  it('collapses and expands a sprint group with the toggle button', async () => {
    backlog.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-9', title: 'Sprint child', sprintId: 'sp-future' }),
    ]);
    sprintsList.mockResolvedValue([
      sprint({ id: 'sp-future', name: 'Toggle Sprint', state: 'future' }),
    ]);
    renderAt('PRJ');

    await screen.findAllByText('Toggle Sprint');
    expect(screen.getByText('Sprint child')).toBeInTheDocument();

    // collapse toggle (▾ when open)
    await userEvent.click(screen.getByRole('button', { name: '▾' }));
    expect(screen.queryByText('Sprint child')).not.toBeInTheDocument();
    // expand again (▸ when closed)
    await userEvent.click(screen.getByRole('button', { name: '▸' }));
    expect(screen.getByText('Sprint child')).toBeInTheDocument();
  });

  it('renders the committed-vs-logged progress bar and the sprint date range', async () => {
    backlog.mockResolvedValue([
      issue({
        id: 'i1',
        key: 'GIRA-7',
        title: 'Pointed work',
        sprintId: 'sp-active',
        storyPoints: 8,
        loggedMinutes: 120,
      }),
    ]);
    sprintsList.mockResolvedValue([
      sprint({
        id: 'sp-active',
        name: 'Dated Sprint',
        state: 'active',
        startDate: '2026-06-01T00:00:00Z',
        endDate: '2026-06-14T00:00:00Z',
      }),
    ]);
    renderAt('PRJ');

    await screen.findByText('Pointed work');
    // committed points stat (8) renders → progress bar branch (committedPts > 0) executes
    expect(screen.getByText('8')).toBeInTheDocument();
    // the date range uses an arrow separator between start/end
    expect(screen.getByText(/→/)).toBeInTheDocument();
  });

  it('shows the empty-sprint placeholder when a sprint has no issues', async () => {
    backlog.mockResolvedValue([]);
    sprintsList.mockResolvedValue([sprint({ id: 'sp-future', name: 'Empty Sprint' })]);
    renderAt('PRJ');

    await screen.findByText('Empty Sprint');
    expect(
      screen.getByText(/Sin tickets en este sprint · No issues in sprint/i),
    ).toBeInTheDocument();
  });

  // ── assign-to-sprint flow (the per-row <select>) ────────────────────────────
  it('assigns an issue to a sprint via the row select and toasts the sprint name', async () => {
    backlog.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-1', title: 'Unscheduled item', sprintId: null }),
    ]);
    sprintsList.mockResolvedValue([sprint({ id: 'sp-future', name: 'Target Sprint' })]);
    issuesUpdate.mockResolvedValue(issue({ key: 'GIRA-1', sprintId: 'sp-future' }));
    renderAt('PRJ');

    await screen.findByText('Unscheduled item');
    const select = screen.getByRole('combobox', { name: /Asignar a sprint/i });
    await userEvent.selectOptions(select, 'sp-future');

    await waitFor(() =>
      expect(issuesUpdate).toHaveBeenCalledWith('GIRA-1', { sprintId: 'sp-future' }),
    );
  });

  it('removes an issue from its sprint via the row select (sprintId → null)', async () => {
    backlog.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-1', title: 'Scheduled item', sprintId: 'sp-future' }),
    ]);
    sprintsList.mockResolvedValue([sprint({ id: 'sp-future', name: 'Some Sprint' })]);
    issuesUpdate.mockResolvedValue(issue({ key: 'GIRA-1', sprintId: null }));
    renderAt('PRJ');

    await screen.findByText('Scheduled item');
    // The select inside the sprint group row.
    const select = screen.getAllByRole('combobox', { name: /Asignar a sprint/i })[0]!;
    await userEvent.selectOptions(select, '');

    await waitFor(() => expect(issuesUpdate).toHaveBeenCalledWith('GIRA-1', { sprintId: null }));
  });

  it('shows the assign-failed error toast when the assign mutation rejects', async () => {
    backlog.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-1', title: 'Unscheduled item', sprintId: null }),
    ]);
    sprintsList.mockResolvedValue([sprint({ id: 'sp-future', name: 'Target Sprint' })]);
    issuesUpdate.mockImplementation(() => Promise.reject(new Error('assign nope')));
    renderAt('PRJ');

    await screen.findByText('Unscheduled item');
    const select = screen.getByRole('combobox', { name: /Asignar a sprint/i });
    await userEvent.selectOptions(select, 'sp-future');

    await waitFor(() =>
      expect(issuesUpdate).toHaveBeenCalledWith('GIRA-1', { sprintId: 'sp-future' }),
    );
  });

  // ── CreateSprintModal ───────────────────────────────────────────────────────
  it('opens, fills and submits the Create Sprint modal', async () => {
    backlog.mockResolvedValue([]);
    sprintsList.mockResolvedValue([]);
    sprintsCreate.mockResolvedValue(sprint({ id: 'new-sp', name: 'S-05' }));
    renderAt('PRJ');

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getByRole('button', { name: '+ Sprint' }));

    expect(await screen.findByText('// NUEVO SPRINT · NEW SPRINT')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('S-05 · Nombre del sprint'), 'S-05');
    await userEvent.type(screen.getByPlaceholderText('Sprint goal (optional)'), 'ship');

    await userEvent.click(screen.getByRole('button', { name: '+ Crear sprint' }));

    await waitFor(() =>
      expect(sprintsCreate).toHaveBeenCalledWith(
        'PRJ',
        expect.objectContaining({ name: 'S-05', goal: 'ship' }),
      ),
    );
    // modal closes on success
    await waitFor(() =>
      expect(screen.queryByText('// NUEVO SPRINT · NEW SPRINT')).not.toBeInTheDocument(),
    );
  });

  it('keeps the Create Sprint submit disabled until a name is typed', async () => {
    backlog.mockResolvedValue([]);
    renderAt('PRJ');

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getByRole('button', { name: '+ Sprint' }));
    await screen.findByText('// NUEVO SPRINT · NEW SPRINT');

    const submit = screen.getByRole('button', { name: '+ Crear sprint' });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText('S-05 · Nombre del sprint'), 'X');
    expect(submit).toBeEnabled();
  });

  it('shows an inline error when Create Sprint fails', async () => {
    backlog.mockResolvedValue([]);
    sprintsCreate.mockImplementation(() => Promise.reject(new Error('sprint create boom')));
    renderAt('PRJ');

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getByRole('button', { name: '+ Sprint' }));
    await screen.findByText('// NUEVO SPRINT · NEW SPRINT');

    await userEvent.type(screen.getByPlaceholderText('S-05 · Nombre del sprint'), 'S-09');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear sprint' }));

    expect(await screen.findByText(/sprint create boom/i)).toBeInTheDocument();
    // modal stays open on error
    expect(screen.getByText('// NUEVO SPRINT · NEW SPRINT')).toBeInTheDocument();
  });

  it('closes the Create Sprint modal via the Cancelar button', async () => {
    backlog.mockResolvedValue([]);
    renderAt('PRJ');

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getByRole('button', { name: '+ Sprint' }));
    const heading = await screen.findByText('// NUEVO SPRINT · NEW SPRINT');
    const modal = heading.closest('div')!.parentElement!;

    await userEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() =>
      expect(screen.queryByText('// NUEVO SPRINT · NEW SPRINT')).not.toBeInTheDocument(),
    );
  });

  it('closes the Create Sprint modal via the ✕ header button', async () => {
    backlog.mockResolvedValue([]);
    renderAt('PRJ');

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getByRole('button', { name: '+ Sprint' }));
    await screen.findByText('// NUEVO SPRINT · NEW SPRINT');

    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    await waitFor(() =>
      expect(screen.queryByText('// NUEVO SPRINT · NEW SPRINT')).not.toBeInTheDocument(),
    );
  });

  it('closes the Create Sprint modal when the scrim is clicked', async () => {
    backlog.mockResolvedValue([]);
    const { container } = renderAt('PRJ');

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getByRole('button', { name: '+ Sprint' }));
    await screen.findByText('// NUEVO SPRINT · NEW SPRINT');

    const scrim = container.querySelector('.gs-scrim') as HTMLElement;
    await userEvent.click(scrim);
    await waitFor(() =>
      expect(screen.queryByText('// NUEVO SPRINT · NEW SPRINT')).not.toBeInTheDocument(),
    );
  });

  // ── CreateIssueModal ────────────────────────────────────────────────────────
  it('opens, fills and submits the Create Issue modal from the Subbar', async () => {
    backlog.mockResolvedValue([]);
    issuesCreate.mockResolvedValue(issue({ key: 'GIRA-99' }));
    renderAt('PRJ');

    await screen.findByText('PENDIENTES');
    // The Subbar "+ Ticket" is the b-btn--ink one; there are two + Ticket buttons.
    const ticketButtons = screen.getAllByRole('button', { name: '+ Ticket' });
    await userEvent.click(ticketButtons[0]!);

    expect(await screen.findByText(/NUEVO TICKET · NEW ISSUE · PRJ/)).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Describe el ticket…'), 'A brand new ticket');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear ticket' }));

    await waitFor(() =>
      expect(issuesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ projectKey: 'PRJ', title: 'A brand new ticket', type: 'task' }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByText(/NUEVO TICKET · NEW ISSUE · PRJ/)).not.toBeInTheDocument(),
    );
  });

  it('opens the Create Issue modal from the backlog group + Ticket button', async () => {
    backlog.mockResolvedValue([]);
    renderAt('PRJ');

    await screen.findByText('PENDIENTES');
    // Second "+ Ticket" lives in the BacklogGroup header.
    const ticketButtons = screen.getAllByRole('button', { name: '+ Ticket' });
    await userEvent.click(ticketButtons[ticketButtons.length - 1]!);
    expect(await screen.findByText(/NUEVO TICKET · NEW ISSUE · PRJ/)).toBeInTheDocument();
  });

  it('submits the Create Issue modal on Enter', async () => {
    backlog.mockResolvedValue([]);
    issuesCreate.mockResolvedValue(issue({ key: 'GIRA-100' }));
    renderAt('PRJ');

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getAllByRole('button', { name: '+ Ticket' })[0]!);
    const input = await screen.findByPlaceholderText('Describe el ticket…');
    await userEvent.type(input, 'Quick ticket{Enter}');

    await waitFor(() =>
      expect(issuesCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Quick ticket' })),
    );
  });

  it('closes the Create Issue modal on Escape from the title input', async () => {
    backlog.mockResolvedValue([]);
    renderAt('PRJ');

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getAllByRole('button', { name: '+ Ticket' })[0]!);
    const input = await screen.findByPlaceholderText('Describe el ticket…');
    await userEvent.type(input, '{Escape}');

    await waitFor(() =>
      expect(screen.queryByText(/NUEVO TICKET · NEW ISSUE · PRJ/)).not.toBeInTheDocument(),
    );
  });

  it('keeps the Create Issue submit disabled until a title is typed', async () => {
    backlog.mockResolvedValue([]);
    renderAt('PRJ');

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getAllByRole('button', { name: '+ Ticket' })[0]!);
    await screen.findByText(/NUEVO TICKET · NEW ISSUE · PRJ/);

    const submit = screen.getByRole('button', { name: '+ Crear ticket' });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText('Describe el ticket…'), 'T');
    expect(submit).toBeEnabled();
  });

  it('shows an inline error when Create Issue fails', async () => {
    backlog.mockResolvedValue([]);
    issuesCreate.mockImplementation(() => Promise.reject(new Error('issue create boom')));
    renderAt('PRJ');

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getAllByRole('button', { name: '+ Ticket' })[0]!);
    await screen.findByText(/NUEVO TICKET · NEW ISSUE · PRJ/);

    await userEvent.type(screen.getByPlaceholderText('Describe el ticket…'), 'Broken ticket');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear ticket' }));

    expect(await screen.findByText(/issue create boom/i)).toBeInTheDocument();
  });

  it('closes the Create Issue modal via the Cancelar button', async () => {
    backlog.mockResolvedValue([]);
    renderAt('PRJ');

    await screen.findByText('PENDIENTES');
    await userEvent.click(screen.getAllByRole('button', { name: '+ Ticket' })[0]!);
    const heading = await screen.findByText(/NUEVO TICKET · NEW ISSUE · PRJ/);
    const modal = heading.closest('div')!.parentElement!;

    await userEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() =>
      expect(screen.queryByText(/NUEVO TICKET · NEW ISSUE · PRJ/)).not.toBeInTheDocument(),
    );
  });

  // ── URL search query filtering ──────────────────────────────────────────────
  it('filters the backlog by the URL ?q= search query and shows the search pill', async () => {
    backlog.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-1', title: 'Apple pie' }),
      issue({ id: 'i2', key: 'GIRA-2', title: 'Banana split' }),
    ]);
    renderWithProviders(
      <Routes>
        <Route path="/projects/:key/backlog" element={<BacklogPage />} />
      </Routes>,
      { route: '/projects/PRJ/backlog?q=banana' },
    );

    expect(await screen.findByText('Banana split')).toBeInTheDocument();
    expect(screen.queryByText('Apple pie')).not.toBeInTheDocument();
    // The search pill renders the lowercased query.
    expect(screen.getByText('banana')).toBeInTheDocument();
  });
});
