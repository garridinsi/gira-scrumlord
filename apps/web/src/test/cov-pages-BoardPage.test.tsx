// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage top-up for src/pages/BoardPage.tsx — surgical cases for the branches the
// main board-page.test.tsx leaves uncovered: ApiError arms of every onError toast,
// the sprint strip with null dates/points, the unknown-status-name fallback, the
// Alt+ArrowLeft / Alt+Arrow{Up,Down} keyboard paths, onDragEnd, the drop-index scan
// over a populated column, closing the drawer, and clearing the label filter to null.
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
// Drawer stub with a working close button so we can exercise BoardPage's closeDrawer
// handler (navigate back to the bare pathname, dropping the ?issue= query param).
vi.mock('../ui/IssueDrawer', () => ({
  IssueDrawer: ({ issueKey, onClose }: { issueKey: string; onClose: () => void }) => (
    <div data-testid="issue-drawer">
      <span>drawer:{issueKey}</span>
      <button type="button" onClick={onClose}>
        close-drawer
      </button>
    </div>
  ),
}));

import { BoardPage } from '../pages/BoardPage';
// The mocked ApiError class — instances satisfy `err instanceof ApiError` in the source,
// driving the left arm of every `err instanceof ApiError ? err.message : 'Error'` ternary.
import { ApiError } from '../api/client';

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

// Three cards in one To Do column (+ an empty Done) — used for keyboard reorder and the
// populated-column drop-index scan.
const threeCardBoard = () => ({
  projectKey: 'PRJ',
  columns: [
    {
      status: { id: 's1', name: 'To Do', category: 'todo', order: 0 },
      issues: [
        issue({ id: 'i1', key: 'GIRA-1', title: 'A' }),
        issue({ id: 'i2', key: 'GIRA-2', title: 'B' }),
        issue({ id: 'i3', key: 'GIRA-3', title: 'C' }),
      ],
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

describe('BoardPage coverage top-up', () => {
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

  // ── ApiError arms of the onError toasts ────────────────────────────────────────

  it('create error uses the ApiError message arm (no modal close)', async () => {
    board.mockResolvedValue(twoColBoard());
    issueCreate.mockRejectedValue(new ApiError(409, null, 'duplicate key'));
    renderAt();
    await screen.findByText('First card');

    await userEvent.click(screen.getByRole('button', { name: '+ Nuevo ticket' }));
    const dialog = await screen.findByRole('dialog', { name: 'Crear ticket' });
    await userEvent.type(within(dialog).getByPlaceholderText('Título · Title'), 'Dup');
    await userEvent.click(within(dialog).getByRole('button', { name: '+ Crear · Create' }));

    await waitFor(() => expect(issueCreate).toHaveBeenCalled());
    // ApiError → onError ran the message arm (toast is a no-op); the modal stays open.
    expect(screen.getByRole('dialog', { name: 'Crear ticket' })).toBeInTheDocument();
  });

  it('sprint close error uses the ApiError message arm', async () => {
    board.mockResolvedValue(twoColBoard());
    sprintsList.mockResolvedValue([sprint({ name: 'Sprint 7' })]);
    sprintClose.mockRejectedValue(new ApiError(409, null, 'cannot close'));
    renderAt();
    await screen.findByText('First card');

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sprint' }));
    await waitFor(() => expect(sprintClose).toHaveBeenCalledWith('sp1'));
    // onError ran the ApiError arm; the strip is still mounted (close did not succeed).
    expect(screen.getByText('SPRINT · ACTIVO')).toBeInTheDocument();
  });

  it('sprint goal save error uses the ApiError message arm and keeps the editor open', async () => {
    board.mockResolvedValue(twoColBoard());
    sprintsList.mockResolvedValue([sprint({ goal: null })]);
    sprintUpdate.mockRejectedValue(new ApiError(422, null, 'goal too long'));
    renderAt();
    await screen.findByText('First card');

    await userEvent.click(screen.getByRole('button', { name: /Añadir objetivo · Add goal/ }));
    const goalInput = screen.getByPlaceholderText(/Sprint goal/);
    await userEvent.type(goalInput, 'A goal{Enter}');

    await waitFor(() => expect(sprintUpdate).toHaveBeenCalled());
    // onError ran (message arm) → editingGoal stays true, the input is still present.
    expect(screen.getByPlaceholderText(/Sprint goal/)).toBeInTheDocument();
  });

  it('move error uses the ApiError message arm and re-fetches the board', async () => {
    board.mockResolvedValue(twoColBoard());
    issueMove.mockRejectedValue(new ApiError(409, null, 'conflict'));
    renderAt();
    const card = await screen.findByRole('button', { name: /GIRA-1: First card/ });
    card.focus();
    await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');

    await waitFor(() => expect(issueMove).toHaveBeenCalled());
    // onError invalidates ['board'] → the board query re-fetches.
    await waitFor(() => expect(board.mock.calls.length).toBeGreaterThan(1));
  });

  // ── sprint strip with null dates / points ──────────────────────────────────────

  it('renders the sprint strip when start/end dates and committed points are null', async () => {
    board.mockResolvedValue(twoColBoard());
    sprintsList.mockResolvedValue([
      sprint({ startDate: null, endDate: null, committedPoints: null }),
    ]);
    renderAt();
    await screen.findByText('First card');
    // Strip still renders (day 1/1, no PTS span because committed === 0).
    expect(screen.getByText('SPRINT · ACTIVO')).toBeInTheDocument();
    expect(screen.getByText('Día 1 / 1')).toBeInTheDocument();
  });

  // ── unknown status-name fallback in ColHeader ──────────────────────────────────

  it('falls back to the raw status name for an unmapped column', async () => {
    board.mockResolvedValue({
      projectKey: 'PRJ',
      columns: [
        {
          status: { id: 's1', name: 'Blocked', category: 'todo', order: 0 },
          issues: [issue({ key: 'GIRA-1', title: 'Stuck card' })],
        },
      ],
    });
    renderAt();
    await screen.findByText('Stuck card');
    // "Blocked" is not in colNames → both es/en fall back to the raw name (rendered twice
    // by the bilingual Bi atom).
    expect(screen.getAllByText('Blocked').length).toBeGreaterThan(0);
  });

  // ── keyboard move/reorder paths ────────────────────────────────────────────────

  it('moves a focused card to the previous column with Alt+ArrowLeft (dir = -1)', async () => {
    board.mockResolvedValue({
      projectKey: 'PRJ',
      columns: [
        { status: { id: 's1', name: 'To Do', category: 'todo', order: 0 }, issues: [] },
        {
          status: { id: 's2', name: 'Done', category: 'done', order: 4 },
          issues: [issue({ key: 'GIRA-9', title: 'Right card', statusId: 's2' })],
        },
      ],
    });
    issueMove.mockResolvedValue({ key: 'GIRA-9' });
    renderAt();
    const card = await screen.findByRole('button', { name: /GIRA-9: Right card/ });
    card.focus();
    await userEvent.keyboard('{Alt>}{ArrowLeft}{/Alt}');
    // dir = -1 → moves into the To Do column (s1).
    await waitFor(() => expect(issueMove).toHaveBeenCalledWith('GIRA-9', { statusId: 's1' }));
    expect(await screen.findByText(/GIRA-9 movido a · moved to To Do/)).toBeInTheDocument();
  });

  it('reorders within a column with Alt+ArrowDown (middle card moves down)', async () => {
    board.mockResolvedValue(threeCardBoard());
    issueMove.mockResolvedValue({ key: 'GIRA-2' });
    renderAt();
    const card = await screen.findByRole('button', { name: /GIRA-2: B/ });
    card.focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    // idx 1 < 2 → neighbours are GIRA-3 (beforeId, the card now above the slot) and
    // GIRA-4 which does not exist → afterId undefined.
    await waitFor(() =>
      expect(issueMove).toHaveBeenCalledWith(
        'GIRA-2',
        expect.objectContaining({ beforeId: 'GIRA-3', afterId: undefined }),
      ),
    );
    expect(await screen.findByText(/GIRA-2 reordenada · reordered/)).toBeInTheDocument();
  });

  it('reorders the bottom card up with Alt+ArrowUp (afterId is the card it passes)', async () => {
    board.mockResolvedValue(threeCardBoard());
    issueMove.mockResolvedValue({ key: 'GIRA-3' });
    renderAt();
    const card = await screen.findByRole('button', { name: /GIRA-3: C/ });
    card.focus();
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
    // idx 2 > 0 → beforeId = columnIssues[idx-2] = GIRA-1, afterId = columnIssues[idx-1] = GIRA-2.
    await waitFor(() =>
      expect(issueMove).toHaveBeenCalledWith(
        'GIRA-3',
        expect.objectContaining({ beforeId: 'GIRA-1', afterId: 'GIRA-2' }),
      ),
    );
  });

  it('ignores Alt+ArrowUp on the top card (idx 0, no reorder)', async () => {
    board.mockResolvedValue(threeCardBoard());
    renderAt();
    const card = await screen.findByRole('button', { name: /GIRA-1: A/ });
    card.focus();
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(issueMove).not.toHaveBeenCalled();
  });

  it('ignores Alt+ArrowDown on the bottom card (idx === last, no reorder)', async () => {
    board.mockResolvedValue(threeCardBoard());
    renderAt();
    const card = await screen.findByRole('button', { name: /GIRA-3: C/ });
    card.focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(issueMove).not.toHaveBeenCalled();
  });

  // ── onDragEnd ──────────────────────────────────────────────────────────────────

  it('clears drag state on dragEnd without issuing a move', async () => {
    board.mockResolvedValue(twoColBoard());
    const { container } = renderAt();
    await screen.findByText('First card');

    const cardWrapper = container.querySelector('[data-issue-key="GIRA-1"]') as HTMLElement;
    expect(cardWrapper).toBeTruthy();
    fireEvent.dragStart(cardWrapper, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } });
    // dragEnd resets dragKey/overCol — the card is still on the board, no move fired.
    fireEvent.dragEnd(cardWrapper);
    expect(issueMove).not.toHaveBeenCalled();
    expect(screen.getByText('First card')).toBeInTheDocument();
  });

  // ── drop-index scan over a populated column ────────────────────────────────────

  it('computes the drop index by scanning the cards of a populated target column', async () => {
    board.mockResolvedValue(threeCardBoard());
    issueMove.mockResolvedValue({ key: 'GIRA-1' });
    const { container } = renderAt();
    await screen.findByRole('button', { name: /GIRA-1: A/ });

    // Drag GIRA-1 and drop it back into the same (populated) To Do column. The drop
    // handler scans the remaining cards (GIRA-2/GIRA-3); a negative clientY makes the
    // very first card's midpoint comparison true, so dropIndex = 0 / break.
    const cardWrapper = container.querySelector('[data-issue-key="GIRA-1"]') as HTMLElement;
    fireEvent.dragStart(cardWrapper, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } });

    const todoCol = Array.from(container.querySelectorAll('div')).find(
      (d) =>
        d.getAttribute('style')?.includes('min-height: 600px') &&
        within(d).queryAllByText('To Do').length > 0,
    ) as HTMLElement;
    expect(todoCol).toBeTruthy();

    fireEvent.dragOver(todoCol, { clientY: -10 });
    fireEvent.drop(todoCol, { clientY: -10 });

    await waitFor(() =>
      expect(issueMove).toHaveBeenCalledWith('GIRA-1', expect.objectContaining({ statusId: 's1' })),
    );
  });

  // ── close drawer ───────────────────────────────────────────────────────────────

  it('opens then closes the issue drawer (closeDrawer drops the query param)', async () => {
    board.mockResolvedValue(twoColBoard());
    renderAt();
    await userEvent.click(await screen.findByText('First card'));
    const drawer = await screen.findByTestId('issue-drawer');
    expect(drawer).toHaveTextContent('drawer:GIRA-1');

    await userEvent.click(within(drawer).getByRole('button', { name: 'close-drawer' }));
    await waitFor(() => expect(screen.queryByTestId('issue-drawer')).not.toBeInTheDocument());
  });

  // ── label filter cleared back to null via the select ───────────────────────────

  it('clears the label filter by re-selecting the "cualquiera" option (value || null)', async () => {
    labelsList.mockResolvedValue([{ id: 'l1', name: 'frontend', color: '#fff' }]);
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

    const labelSelect = screen.getAllByRole('combobox')[0]!;
    await userEvent.selectOptions(labelSelect, 'l1');
    await waitFor(() => expect(screen.queryByText('Untagged card')).not.toBeInTheDocument());

    // Re-selecting the empty option exercises the `e.target.value || null` falsy arm.
    await userEvent.selectOptions(labelSelect, '');
    expect(await screen.findByText('Untagged card')).toBeInTheDocument();
    // the clear-filter button is gone again (labelId back to null)
    expect(screen.queryByRole('button', { name: /Limpiar filtros/ })).not.toBeInTheDocument();
  });
});
