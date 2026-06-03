// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import type { IssueView } from '@gira/shared';
import type { SprintRecord } from '../api/client';
import { renderWithProviders } from './render';

const {
  board,
  sprintsList,
  labelsList,
  incidentsList,
  issueCreate,
  issueMove,
  sprintClose,
  sprintUpdate,
} = vi.hoisted(() => ({
  board: vi.fn(),
  sprintsList: vi.fn(),
  labelsList: vi.fn(),
  incidentsList: vi.fn(),
  issueCreate: vi.fn(),
  issueMove: vi.fn(),
  sprintClose: vi.fn(),
  sprintUpdate: vi.fn(),
}));

vi.mock('../api/client', () => ({
  projects: {
    board: (k: string) => board(k),
    sprints: { list: (k: string) => sprintsList(k) },
    labels: { list: (k: string) => labelsList(k) },
  },
  issues: {
    create: (d: unknown) => issueCreate(d),
    move: (k: string, d: unknown) => issueMove(k, d),
    get: vi.fn(),
    update: vi.fn(),
  },
  incidents: { list: (f?: string) => incidentsList(f) },
  sprints: {
    close: (id: string) => sprintClose(id),
    update: (id: string, d: unknown) => sprintUpdate(id, d),
    start: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useProjectTabs', () => ({ useProjectTabs: () => [] }));
// The drawer is a heavy data-driven panel of its own — stub it so opening the drawer
// via the emergency banner exercises BoardPage's navigation handler without dragging
// in the drawer's queries. Rendering it (vs null) proves drawerKey reached it.
vi.mock('../ui/IssueDrawer', () => ({
  IssueDrawer: ({ issueKey }: { issueKey: string }) => (
    <div data-testid="issue-drawer">drawer:{issueKey}</div>
  ),
}));

import { BoardPage } from '../pages/BoardPage';

const issue = (over: Partial<IssueView>): IssueView =>
  ({
    id: 'i1',
    key: 'GIRA-1',
    title: 'Card one',
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

const sprint = (over: Partial<SprintRecord> = {}): SprintRecord => ({
  id: 'sp1',
  projectId: 'p1',
  name: 'Sprint 7',
  goal: null,
  startDate: '2026-05-25T00:00:00Z',
  endDate: '2026-06-08T00:00:00Z',
  state: 'active',
  committedPoints: 21,
  completedPoints: 8,
  ...over,
});

// A two-column board: a To Do column (with one card) and a Done column.
const twoColBoard = (extra?: Partial<IssueView>) => ({
  projectKey: 'PRJ',
  columns: [
    {
      status: { id: 's1', name: 'To Do', category: 'todo', order: 0 },
      issues: [issue({ id: 'i1', key: 'GIRA-1', title: 'First card', ...extra })],
    },
    { status: { id: 's2', name: 'Done', category: 'done', order: 4 }, issues: [] },
  ],
});

const renderAt = (key = 'PRJ') =>
  renderWithProviders(
    <Routes>
      <Route path="/projects/:key/board" element={<BoardPage />} />
    </Routes>,
    { route: `/projects/${key}/board` },
  );

describe('BoardPage', () => {
  beforeEach(() => {
    board.mockReset();
    sprintsList.mockReset().mockResolvedValue([]);
    labelsList.mockReset().mockResolvedValue([]);
    incidentsList.mockReset().mockResolvedValue([]);
    issueCreate.mockReset();
    issueMove.mockReset();
    sprintClose.mockReset();
    sprintUpdate.mockReset();
  });

  // ── column rendering & states ───────────────────────────────────────────────

  it('renders columns with their issue cards and the empty-column placeholder', async () => {
    board.mockResolvedValue(twoColBoard());
    renderAt();

    expect(await screen.findByText('First card')).toBeInTheDocument();
    expect(screen.getByText('GIRA-1')).toBeInTheDocument();
    // To Do header (bilingual) + Done header
    expect(screen.getAllByText('To Do').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Done').length).toBeGreaterThan(0);
    // The empty Done column shows the placeholder
    expect(screen.getByText('Vacío · Empty')).toBeInTheDocument();
    expect(board).toHaveBeenCalledWith('PRJ');
  });

  it('shows the loading state while the board query is pending', () => {
    let resolve: (v: unknown) => void = () => {};
    board.mockReturnValue(new Promise((r) => (resolve = r)));
    renderAt();
    expect(screen.getByText('cargando tablero · loading board')).toBeInTheDocument();
    resolve(twoColBoard());
  });

  it('shows the error state when the board query rejects', async () => {
    board.mockRejectedValue(new Error('boom'));
    renderAt();
    expect(
      await screen.findByText('No se pudo cargar el tablero · Failed to load board'),
    ).toBeInTheDocument();
    expect(screen.getByText('ERROR')).toBeInTheDocument();
  });

  it('does not render a "+ Nuevo" button under a done column', async () => {
    board.mockResolvedValue(twoColBoard());
    renderAt();
    await screen.findByText('First card');
    // Only the To Do column has the per-column add button (done columns omit it).
    expect(screen.getAllByRole('button', { name: '+ Nuevo' })).toHaveLength(1);
  });

  // ── emergency banner ─────────────────────────────────────────────────────────

  it('renders the emergency banner for an emergency-priority issue', async () => {
    board.mockResolvedValue({
      projectKey: 'PRJ',
      columns: [
        {
          status: { id: 's1', name: 'To Do', category: 'todo', order: 0 },
          issues: [issue({ key: 'GIRA-9', title: 'PROD DOWN', priority: 'emergency' })],
        },
      ],
    });
    renderAt();
    await screen.findByText('!! EMERGENCIA');
    expect(screen.getByText('PRIORIDAD MÁXIMA · P0')).toBeInTheDocument();
    expect(screen.getByText('GIRA-9 · PROD DOWN')).toBeInTheDocument();
  });

  it('opens the drawer from the emergency banner "Abrir" button', async () => {
    board.mockResolvedValue({
      projectKey: 'PRJ',
      columns: [
        {
          status: { id: 's1', name: 'To Do', category: 'todo', order: 0 },
          issues: [issue({ key: 'GIRA-9', title: 'PROD DOWN', priority: 'emergency' })],
        },
      ],
    });
    renderAt();
    await screen.findByText('!! EMERGENCIA');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByTestId('issue-drawer')).toHaveTextContent('drawer:GIRA-9');
  });

  it('dismisses the emergency banner with the ✕ button', async () => {
    board.mockResolvedValue({
      projectKey: 'PRJ',
      columns: [
        {
          status: { id: 's1', name: 'To Do', category: 'todo', order: 0 },
          issues: [issue({ key: 'GIRA-9', title: 'PROD DOWN', priority: 'emergency' })],
        },
      ],
    });
    renderAt();
    await screen.findByText('!! EMERGENCIA');
    // The banner ✕ is the second ✕-only button (the first is the modal's, not mounted here).
    const dismiss = screen
      .getAllByRole('button')
      .find((b) => b.textContent === '✕' && b.className.includes('b-btn--ghost'));
    expect(dismiss).toBeTruthy();
    await userEvent.click(dismiss!);
    await waitFor(() => expect(screen.queryByText('!! EMERGENCIA')).not.toBeInTheDocument());
  });

  // ── create issue modal ─────────────────────────────────────────────────────

  it('opens the create modal from the toolbar and creates an issue', async () => {
    board.mockResolvedValue(twoColBoard());
    issueCreate.mockResolvedValue({ key: 'GIRA-42' });
    renderAt();
    await screen.findByText('First card');

    await userEvent.click(screen.getByRole('button', { name: '+ Nuevo ticket' }));
    const dialog = await screen.findByRole('dialog', { name: 'Crear ticket' });

    const titleInput = within(dialog).getByPlaceholderText('Título · Title');
    await userEvent.type(titleInput, 'Brand new ticket');

    // change type + priority selects (exercises their onChange handlers)
    const selects = within(dialog).getAllByRole('combobox');
    await userEvent.selectOptions(selects[0]!, 'bug');
    await userEvent.selectOptions(selects[1]!, 'high');
    // status select (third combobox, present because statuses.length > 0)
    await userEvent.selectOptions(selects[2]!, 's2');

    await userEvent.click(within(dialog).getByRole('button', { name: '+ Crear · Create' }));

    await waitFor(() =>
      expect(issueCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          projectKey: 'PRJ',
          title: 'Brand new ticket',
          type: 'bug',
          priority: 'high',
          statusId: 's2',
          billingMode: 'hourly',
        }),
      ),
    );
    // success closes the modal
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Crear ticket' })).toBeNull());
  });

  it('submits the create modal with the Enter key', async () => {
    board.mockResolvedValue(twoColBoard());
    issueCreate.mockResolvedValue({ key: 'GIRA-43' });
    renderAt();
    await screen.findByText('First card');

    await userEvent.click(screen.getByRole('button', { name: '+ Nuevo ticket' }));
    const dialog = await screen.findByRole('dialog', { name: 'Crear ticket' });
    const titleInput = within(dialog).getByPlaceholderText('Título · Title');
    await userEvent.type(titleInput, 'Via enter{Enter}');

    await waitFor(() =>
      expect(issueCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Via enter' })),
    );
  });

  it('keeps the create button disabled until a title is typed', async () => {
    board.mockResolvedValue(twoColBoard());
    renderAt();
    await screen.findByText('First card');
    await userEvent.click(screen.getByRole('button', { name: '+ Nuevo ticket' }));
    const dialog = await screen.findByRole('dialog', { name: 'Crear ticket' });
    const createBtn = within(dialog).getByRole('button', { name: '+ Crear · Create' });
    expect(createBtn).toBeDisabled();
    await userEvent.type(within(dialog).getByPlaceholderText('Título · Title'), 'x');
    expect(createBtn).toBeEnabled();
  });

  it('surfaces the create error branch without closing the modal', async () => {
    board.mockResolvedValue(twoColBoard());
    issueCreate.mockRejectedValue(new Error('nope'));
    renderAt();
    await screen.findByText('First card');

    await userEvent.click(screen.getByRole('button', { name: '+ Nuevo ticket' }));
    const dialog = await screen.findByRole('dialog', { name: 'Crear ticket' });
    await userEvent.type(within(dialog).getByPlaceholderText('Título · Title'), 'Fails');
    await userEvent.click(within(dialog).getByRole('button', { name: '+ Crear · Create' }));

    await waitFor(() => expect(issueCreate).toHaveBeenCalled());
    // onError ran (toast no-op) and the modal stays open
    expect(screen.getByRole('dialog', { name: 'Crear ticket' })).toBeInTheDocument();
  });

  it('closes the create modal via the Cancelar button', async () => {
    board.mockResolvedValue(twoColBoard());
    renderAt();
    await screen.findByText('First card');
    await userEvent.click(screen.getByRole('button', { name: '+ Nuevo ticket' }));
    const dialog = await screen.findByRole('dialog', { name: 'Crear ticket' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Crear ticket' })).toBeNull());
  });

  it('closes the create modal by clicking the scrim backdrop', async () => {
    board.mockResolvedValue(twoColBoard());
    renderAt();
    await screen.findByText('First card');
    await userEvent.click(screen.getByRole('button', { name: '+ Nuevo ticket' }));
    const dialog = await screen.findByRole('dialog', { name: 'Crear ticket' });
    // clicking the scrim itself (target === currentTarget) closes
    fireEvent.click(dialog);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Crear ticket' })).toBeNull());
  });

  it('opens the create modal pre-set to a column via its "+ Nuevo" button', async () => {
    board.mockResolvedValue(twoColBoard());
    renderAt();
    await screen.findByText('First card');
    await userEvent.click(screen.getByRole('button', { name: '+ Nuevo' }));
    const dialog = await screen.findByRole('dialog', { name: 'Crear ticket' });
    // status select defaulted to the column the button belongs to (s1 / To Do)
    const statusSelect = within(dialog).getAllByRole('combobox')[2] as HTMLSelectElement;
    expect(statusSelect.value).toBe('s1');
  });

  // ── keyboard move (G1 a11y) ──────────────────────────────────────────────────

  it('moves a focused card to the next column with Alt+ArrowRight, announced for SRs', async () => {
    board.mockResolvedValue(twoColBoard());
    issueMove.mockResolvedValue({ key: 'GIRA-1' });
    renderAt();
    const card = await screen.findByRole('button', { name: /GIRA-1: First card/ });
    card.focus();
    await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
    await waitFor(() => expect(issueMove).toHaveBeenCalledWith('GIRA-1', { statusId: 's2' }));
    expect(await screen.findByText(/GIRA-1 movido a · moved to Done/)).toBeInTheDocument();
  });

  it('does not move a card past the last column', async () => {
    board.mockResolvedValue({
      projectKey: 'PRJ',
      columns: [
        { status: { id: 's1', name: 'To Do', category: 'todo', order: 0 }, issues: [] },
        {
          status: { id: 's2', name: 'Done', category: 'done', order: 4 },
          issues: [issue({ key: 'GIRA-9', title: 'Last card', statusId: 's2' })],
        },
      ],
    });
    renderAt();
    const card = await screen.findByRole('button', { name: /GIRA-9: Last card/ });
    card.focus();
    await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(issueMove).not.toHaveBeenCalled();
  });

  // ── drag & drop move ─────────────────────────────────────────────────────────

  it('moves a card across columns via drag-and-drop with an optimistic update', async () => {
    board.mockResolvedValue(twoColBoard());
    issueMove.mockResolvedValue({ key: 'GIRA-1' });
    const { container } = renderAt();
    await screen.findByText('First card');

    const cardWrapper = container.querySelector('[data-issue-key="GIRA-1"]') as HTMLElement;
    expect(cardWrapper).toBeTruthy();

    // start dragging the card
    fireEvent.dragStart(cardWrapper, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } });

    // the Done column is the drop target (the 2nd dashed drop zone)
    const dropZones = container.querySelectorAll('[style*="min-height"]');
    // find the column div that contains the Done header
    const doneCol = Array.from(container.querySelectorAll('div')).find(
      (d) =>
        d.getAttribute('style')?.includes('min-height: 600px') &&
        within(d).queryAllByText('Done').length > 0,
    ) as HTMLElement;
    expect(doneCol).toBeTruthy();
    expect(dropZones.length).toBeGreaterThan(0);

    fireEvent.dragOver(doneCol, { clientY: 100 });
    fireEvent.drop(doneCol, { clientY: 100 });

    await waitFor(() =>
      expect(issueMove).toHaveBeenCalledWith('GIRA-1', expect.objectContaining({ statusId: 's2' })),
    );
  });

  it('reverts (re-fetches) and toasts when the move mutation fails', async () => {
    board.mockResolvedValue(twoColBoard());
    issueMove.mockRejectedValue(new Error('move failed'));
    const { container } = renderAt();
    await screen.findByText('First card');

    const cardWrapper = container.querySelector('[data-issue-key="GIRA-1"]') as HTMLElement;
    fireEvent.dragStart(cardWrapper, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } });

    const doneCol = Array.from(container.querySelectorAll('div')).find(
      (d) =>
        d.getAttribute('style')?.includes('min-height: 600px') &&
        within(d).queryAllByText('Done').length > 0,
    ) as HTMLElement;
    fireEvent.dragOver(doneCol, { clientY: 100 });
    fireEvent.drop(doneCol, { clientY: 100 });

    await waitFor(() => expect(issueMove).toHaveBeenCalled());
    // onError re-invalidates the board → board() re-fetched (initial + revert refetch)
    await waitFor(() => expect(board.mock.calls.length).toBeGreaterThan(1));
  });

  it('ignores a drop when nothing is being dragged', async () => {
    board.mockResolvedValue(twoColBoard());
    const { container } = renderAt();
    await screen.findByText('First card');
    const doneCol = Array.from(container.querySelectorAll('div')).find(
      (d) =>
        d.getAttribute('style')?.includes('min-height: 600px') &&
        within(d).queryAllByText('Done').length > 0,
    ) as HTMLElement;
    fireEvent.drop(doneCol, { clientY: 100 });
    // no dragKey set → early return, no move
    expect(issueMove).not.toHaveBeenCalled();
  });

  // ── label filter ──────────────────────────────────────────────────────────

  it('filters issues by label and clears the filter', async () => {
    labelsList.mockResolvedValue([
      { id: 'l1', name: 'frontend', color: '#fff' },
      { id: 'l2', name: 'backend', color: '#000' },
    ]);
    board.mockResolvedValue({
      projectKey: 'PRJ',
      columns: [
        {
          status: { id: 's1', name: 'To Do', category: 'todo', order: 0 },
          issues: [
            issue({
              key: 'GIRA-1',
              title: 'Tagged card',
              labels: [{ id: 'l1', name: 'frontend', color: '#fff' }],
            }),
            issue({ key: 'GIRA-2', title: 'Untagged card', labels: [] }),
          ],
        },
      ],
    });
    renderAt();
    await screen.findByText('Tagged card');
    expect(screen.getByText('Untagged card')).toBeInTheDocument();

    // the label filter is the first combobox in the toolbar
    const labelSelect = screen.getAllByRole('combobox')[0]!;
    await userEvent.selectOptions(labelSelect, 'l1');

    await waitFor(() => expect(screen.queryByText('Untagged card')).not.toBeInTheDocument());
    expect(screen.getByText('Tagged card')).toBeInTheDocument();

    // clear-filter button appears once a label is selected
    await userEvent.click(screen.getByRole('button', { name: /Limpiar filtros/ }));
    expect(await screen.findByText('Untagged card')).toBeInTheDocument();
  });

  // ── sprint strip ──────────────────────────────────────────────────────────

  it('renders the active sprint strip and closes the sprint', async () => {
    board.mockResolvedValue(twoColBoard());
    sprintsList.mockResolvedValue([sprint({ name: 'Sprint 7' })]);
    sprintClose.mockResolvedValue({});
    renderAt();
    await screen.findByText('First card');
    expect(screen.getByText('SPRINT · ACTIVO')).toBeInTheDocument();
    expect(screen.getAllByText('Sprint 7').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sprint' }));
    await waitFor(() => expect(sprintClose).toHaveBeenCalledWith('sp1'));
  });

  it('adds a sprint goal through the goal editor', async () => {
    board.mockResolvedValue(twoColBoard());
    sprintsList.mockResolvedValue([sprint({ goal: null })]);
    sprintUpdate.mockResolvedValue({});
    renderAt();
    await screen.findByText('First card');

    await userEvent.click(screen.getByRole('button', { name: /Añadir objetivo · Add goal/ }));
    const goalInput = screen.getByPlaceholderText(/Sprint goal/);
    await userEvent.type(goalInput, 'Ship the board{Enter}');

    await waitFor(() =>
      expect(sprintUpdate).toHaveBeenCalledWith('sp1', { goal: 'Ship the board' }),
    );
  });

  it('edits an existing sprint goal and cancels with Escape', async () => {
    board.mockResolvedValue(twoColBoard());
    sprintsList.mockResolvedValue([sprint({ goal: 'Old goal' })]);
    sprintUpdate.mockResolvedValue({});
    renderAt();
    await screen.findByText('First card');

    // existing goal renders as a clickable button
    await userEvent.click(screen.getByRole('button', { name: 'Old goal' }));
    const goalInput = screen.getByPlaceholderText(/Sprint goal/);
    expect(goalInput).toHaveValue('Old goal');

    // Escape closes the editor without saving
    await userEvent.type(goalInput, '{Escape}');
    await waitFor(() => expect(screen.queryByPlaceholderText(/Sprint goal/)).toBeNull());
    expect(sprintUpdate).not.toHaveBeenCalled();
    // the goal button is back
    expect(screen.getByRole('button', { name: 'Old goal' })).toBeInTheDocument();
  });

  it('saves an emptied goal as null via the Save button', async () => {
    board.mockResolvedValue(twoColBoard());
    sprintsList.mockResolvedValue([sprint({ goal: 'Old goal' })]);
    sprintUpdate.mockResolvedValue({});
    renderAt();
    await screen.findByText('First card');

    await userEvent.click(screen.getByRole('button', { name: 'Old goal' }));
    const goalInput = screen.getByPlaceholderText(/Sprint goal/);
    await userEvent.clear(goalInput);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar · Save' }));

    // handleGoalSave maps an empty draft → mutate(null); the api layer then maps
    // null → { goal: undefined } (goal ?? undefined).
    await waitFor(() => expect(sprintUpdate).toHaveBeenCalledWith('sp1', { goal: undefined }));
  });

  it('does not render the sprint strip when no sprint is active', async () => {
    board.mockResolvedValue(twoColBoard());
    sprintsList.mockResolvedValue([sprint({ state: 'future' })]);
    renderAt();
    await screen.findByText('First card');
    expect(screen.queryByText('SPRINT · ACTIVO')).not.toBeInTheDocument();
  });

  // ── WIP limit banner ─────────────────────────────────────────────────────────

  it('shows the WIP-cap banner when an In Progress column exceeds its limit and dismisses it', async () => {
    // "In Progress" has a WIP_LIMIT of 5 → six cards breaches it.
    const overLimit = Array.from({ length: 6 }, (_, i) =>
      issue({ id: `i${i}`, key: `GIRA-${i + 1}`, title: `WIP ${i + 1}` }),
    );
    board.mockResolvedValue({
      projectKey: 'PRJ',
      columns: [
        {
          status: { id: 's1', name: 'In Progress', category: 'in_progress', order: 1 },
          issues: overLimit,
        },
      ],
    });
    renderAt();
    await screen.findByText('WIP 1');
    expect(screen.getByText(/límite excedido · cap exceeded/)).toBeInTheDocument();

    // the WIP banner ✕ dismisses it
    const wipDismiss = screen
      .getAllByRole('button')
      .find((b) => b.textContent === '✕' && b.getAttribute('style')?.includes('var(--eg-fg-3)'));
    expect(wipDismiss).toBeTruthy();
    await userEvent.click(wipDismiss!);
    await waitFor(() =>
      expect(screen.queryByText(/límite excedido · cap exceeded/)).not.toBeInTheDocument(),
    );
  });

  // ── card click opens drawer ───────────────────────────────────────────────

  it('opens the drawer when an issue card is clicked', async () => {
    board.mockResolvedValue(twoColBoard());
    renderAt();
    await userEvent.click(await screen.findByText('First card'));
    expect(await screen.findByTestId('issue-drawer')).toHaveTextContent('drawer:GIRA-1');
  });
});
