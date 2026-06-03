// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IssueView, LabelView, UserView } from '@gira/shared';
import { renderWithProviders } from './render';

// ── Mocks ──────────────────────────────────────────────────────────────────────
const { issuesList, labelsList, usersList, downloadCsv } = vi.hoisted(() => ({
  issuesList: vi.fn(),
  labelsList: vi.fn(),
  usersList: vi.fn(),
  downloadCsv: vi.fn(),
}));

vi.mock('../api/client', () => ({
  issues: { list: (f?: unknown) => issuesList(f) },
  projects: { labels: { list: (k: string) => labelsList(k) } },
  users: { list: () => usersList() },
  ApiError: class ApiError extends Error {},
}));

vi.mock('../lib/csv', () => ({
  downloadCsv: (name: string, rows: unknown[][]) => downloadCsv(name, rows),
}));

import { FilterBar } from '../ui/FilterBar';

// ── Fixtures ─────────────────────────────────────────────────────────────────────
const user = (id: string, name: string): UserView =>
  ({ id, name, email: `${id}@x.io`, role: 'developer', active: true }) as unknown as UserView;

const label = (id: string, name: string, color = '#0b1620'): LabelView =>
  ({ id, name, color }) as unknown as LabelView;

const issue = (over: Partial<IssueView>): IssueView =>
  ({
    id: 'i1',
    key: 'GIRA-1',
    title: 'A filtered issue',
    type: 'task',
    priority: 'high',
    statusName: 'In progress',
    assignee: { id: 'u1', name: 'Ada Lovelace' },
    storyPoints: 3,
    dueAt: '2026-07-01T00:00:00Z',
    ...over,
  }) as unknown as IssueView;

const USERS = [user('u1', 'Ada Lovelace'), user('u2', 'Grace Hopper')];
const LABELS = [label('l1', 'frontend'), label('l2', 'backend')];

// Filter values double as <option> text in the dropdowns, so a bare getByText is
// ambiguous. Active chips are rendered as <span>/<button> (never <option>); this
// matcher finds the chip occurrence specifically.
const chip = (text: string): HTMLElement => {
  const matches = screen.getAllByText(text).filter((el) => el.tagName !== 'OPTION');
  if (matches.length !== 1) {
    throw new Error(`expected exactly one chip with text "${text}", found ${matches.length}`);
  }
  return matches[0]!;
};

function renderBar(
  props?: Partial<{ projectKey: string; myId: string | null; onResults: ReturnType<typeof vi.fn> }>,
) {
  const onResults = props?.onResults ?? vi.fn();
  renderWithProviders(
    <FilterBar
      projectKey={props?.projectKey ?? 'GIRA'}
      myId={props?.myId === undefined ? 'u1' : props.myId}
      onResults={onResults}
    />,
  );
  return { onResults };
}

beforeEach(() => {
  localStorage.clear();
  issuesList.mockReset().mockResolvedValue([]);
  labelsList.mockReset().mockResolvedValue(LABELS);
  usersList.mockReset().mockResolvedValue(USERS);
  downloadCsv.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FilterBar — render & dropdown population', () => {
  it('renders all filter controls and reports null (no filter) on mount', async () => {
    const { onResults } = renderBar();

    // Inactive state: parent told the list is unfiltered.
    await waitFor(() => expect(onResults).toHaveBeenCalledWith(null));

    expect(screen.getByLabelText('Buscar tickets · Search issues')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por asignado · Filter by assignee')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por tipo · Filter by type')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por prioridad · Filter by priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por etiqueta · Filter by label')).toBeInTheDocument();

    // Type options come from the static list.
    expect(screen.getByRole('option', { name: 'bug' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'epic' })).toBeInTheDocument();
    // Priority options.
    expect(screen.getByRole('option', { name: 'urgent' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'emergency' })).toBeInTheDocument();
  });

  it('populates assignee + label dropdowns from the API queries', async () => {
    renderBar();
    // Users come from users.list()
    expect(await screen.findByRole('option', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Grace Hopper' })).toBeInTheDocument();
    // Labels come from projects.labels.list(projectKey)
    expect(await screen.findByRole('option', { name: 'frontend' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'backend' })).toBeInTheDocument();
    expect(labelsList).toHaveBeenCalledWith('GIRA');
    expect(usersList).toHaveBeenCalled();
  });

  it('renders the builtin saved-view pills when myId is provided', async () => {
    renderBar({ myId: 'u1' });
    expect(await screen.findByText('Asignadas a mí · Assigned to me')).toBeInTheDocument();
    expect(screen.getByText('Prioridad alta · High priority')).toBeInTheDocument();
    expect(screen.getByText('Urgentes · Urgent')).toBeInTheDocument();
  });

  it('omits builtin pills when myId is null', async () => {
    renderBar({ myId: null });
    await waitFor(() => expect(usersList).toHaveBeenCalled());
    expect(screen.queryByText('Asignadas a mí · Assigned to me')).not.toBeInTheDocument();
  });
});

describe('FilterBar — search & filtering', () => {
  it('typing in search runs a debounced query and pushes results to the parent', async () => {
    issuesList.mockResolvedValue([issue({ key: 'GIRA-1', title: 'A filtered issue' })]);
    const { onResults } = renderBar();
    await waitFor(() => expect(onResults).toHaveBeenCalledWith(null));

    const search = screen.getByLabelText('Buscar tickets · Search issues');
    await userEvent.type(search, 'down');

    // After debounce, the filter query runs with the typed text.
    await waitFor(
      () =>
        expect(issuesList).toHaveBeenCalledWith(
          expect.objectContaining({ q: 'down', projectKey: 'GIRA' }),
        ),
      { timeout: 2000 },
    );
    // Result count rendered, results pushed to parent.
    expect(await screen.findByText(/1 resultado · result/)).toBeInTheDocument();
    await waitFor(() =>
      expect(onResults).toHaveBeenCalledWith([expect.objectContaining({ key: 'GIRA-1' })]),
    );
    // The active text chip is shown.
    expect(screen.getByText('"down"')).toBeInTheDocument();
  });

  it('pluralizes the result count for multiple / zero results', async () => {
    issuesList.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-1' }),
      issue({ id: 'i2', key: 'GIRA-2' }),
    ]);
    renderBar();
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por prioridad · Filter by priority'),
      'high',
    );
    expect(await screen.findByText(/2 resultados · results/)).toBeInTheDocument();
  });

  it('selecting assignee/type/priority/label calls the API with the chosen values', async () => {
    issuesList.mockResolvedValue([]);
    renderBar();
    await screen.findByRole('option', { name: 'Grace Hopper' });

    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por asignado · Filter by assignee'),
      'u2',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por tipo · Filter by type'),
      'bug',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por prioridad · Filter by priority'),
      'urgent',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por etiqueta · Filter by label'),
      'l2',
    );

    await waitFor(
      () =>
        expect(issuesList).toHaveBeenCalledWith(
          expect.objectContaining({
            projectKey: 'GIRA',
            assigneeId: 'u2',
            type: 'bug',
            priority: 'urgent',
            labelId: 'l2',
          }),
        ),
      { timeout: 2000 },
    );

    // Active chips: assignee resolves to the user's name; type/priority show raw value.
    await waitFor(() => expect(chip('Grace Hopper')).toBeInTheDocument());
    expect(chip('bug')).toBeInTheDocument();
    expect(chip('urgent')).toBeInTheDocument();
    // Label chip shows the label name (rendered inside LabelChipWithClear).
    expect(chip('backend')).toBeInTheDocument();
  });
});

describe('FilterBar — chips & clear', () => {
  it('clearing an individual chip removes just that filter', async () => {
    issuesList.mockResolvedValue([]);
    renderBar();
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por tipo · Filter by type'),
      'story',
    );
    await waitFor(() => expect(chip('story')).toBeInTheDocument());
    const storyChip = chip('story');
    // The chip's clear button is the × inside the same span.
    const clearBtn = storyChip.querySelector('button')!;
    await userEvent.click(clearBtn);
    // The chip span is gone; only the (deselected) <option> text may remain.
    await waitFor(() =>
      expect(screen.getAllByText('story').filter((el) => el.tagName !== 'OPTION')).toHaveLength(0),
    );
  });

  it('clear-all resets every filter and pushes null to the parent', async () => {
    issuesList.mockResolvedValue([issue({ key: 'GIRA-1' })]);
    const { onResults } = renderBar();

    await userEvent.type(screen.getByLabelText('Buscar tickets · Search issues'), 'crash');
    const clearAll = await screen.findByRole('button', { name: /Limpiar · Clear/ });
    onResults.mockClear();
    await userEvent.click(clearAll);

    await waitFor(() => expect(onResults).toHaveBeenCalledWith(null));
    expect(screen.queryByText('"crash"')).not.toBeInTheDocument();
    // Clear-all button disappears when no filter is active.
    expect(screen.queryByRole('button', { name: /Limpiar · Clear/ })).not.toBeInTheDocument();
  });
});

describe('FilterBar — saved views', () => {
  it('applying a builtin view sets the matching filter (priority = high)', async () => {
    issuesList.mockResolvedValue([]);
    renderBar({ myId: 'u1' });
    const highView = await screen.findByText('Prioridad alta · High priority');
    await userEvent.click(highView);

    await waitFor(
      () => expect(issuesList).toHaveBeenCalledWith(expect.objectContaining({ priority: 'high' })),
      { timeout: 2000 },
    );
    await waitFor(() => expect(chip('high')).toBeInTheDocument());
  });

  it('saving a custom view persists it to localStorage and renders a pill', async () => {
    issuesList.mockResolvedValue([]);
    renderBar({ projectKey: 'GIRA' });

    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por prioridad · Filter by priority'),
      'medium',
    );
    const saveBtn = await screen.findByRole('button', { name: /Guardar vista · Save view/ });
    await userEvent.click(saveBtn);

    const nameInput = await screen.findByPlaceholderText('Nombre de vista · View name');
    await userEvent.type(nameInput, 'My medium view');
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(await screen.findByText('My medium view')).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem('gira_saved_views_GIRA') ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ name: 'My medium view', filter: { priority: 'medium' } });
  });

  it('saving with Enter works and Escape cancels the save input', async () => {
    issuesList.mockResolvedValue([]);
    renderBar({ projectKey: 'GIRA' });
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por tipo · Filter by type'),
      'epic',
    );
    // Open save input, then Escape to cancel.
    await userEvent.click(await screen.findByRole('button', { name: /Guardar vista · Save view/ }));
    let nameInput = await screen.findByPlaceholderText('Nombre de vista · View name');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('Nombre de vista · View name')).not.toBeInTheDocument(),
    );

    // Reopen, type a name and press Enter to save.
    await userEvent.click(await screen.findByRole('button', { name: /Guardar vista · Save view/ }));
    nameInput = await screen.findByPlaceholderText('Nombre de vista · View name');
    await userEvent.type(nameInput, 'Epic view{Enter}');
    expect(await screen.findByText('Epic view')).toBeInTheDocument();
  });

  it('the × cancel button closes the save input without saving', async () => {
    issuesList.mockResolvedValue([]);
    renderBar({ projectKey: 'GIRA' });
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por tipo · Filter by type'),
      'task',
    );
    await userEvent.click(await screen.findByRole('button', { name: /Guardar vista · Save view/ }));
    const input = await screen.findByPlaceholderText('Nombre de vista · View name');
    // OK is disabled while name is blank.
    expect(screen.getByRole('button', { name: 'OK' })).toBeDisabled();
    // The trailing ✕ closes it.
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    await waitFor(() => expect(input).not.toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem('gira_saved_views_GIRA') ?? '[]')).toHaveLength(0);
  });

  it('survives corrupted localStorage JSON (loadSavedViews catch branch)', async () => {
    // Malformed JSON should be swallowed and treated as "no saved views".
    localStorage.setItem('gira_saved_views_GIRA', '{not json');
    issuesList.mockResolvedValue([]);
    renderBar({ projectKey: 'GIRA', myId: 'u1' });
    // Builtins still render; no crash, no stray user pill.
    expect(await screen.findByText('Urgentes · Urgent')).toBeInTheDocument();
  });

  it('loads pre-existing saved views from localStorage and can delete one', async () => {
    localStorage.setItem(
      'gira_saved_views_GIRA',
      JSON.stringify([
        {
          id: 'user_1',
          name: 'Stored view',
          filter: { q: '', assigneeId: null, type: 'bug', priority: null, labelId: null },
        },
      ]),
    );
    issuesList.mockResolvedValue([]);
    renderBar({ projectKey: 'GIRA' });

    const pill = await screen.findByText('Stored view');
    // Applying it triggers the filter.
    await userEvent.click(pill);
    await waitFor(
      () => expect(issuesList).toHaveBeenCalledWith(expect.objectContaining({ type: 'bug' })),
      { timeout: 2000 },
    );

    // The delete (×) button lives in the same pill span as the apply button.
    const deleteBtn = pill.parentElement!.querySelector(
      'button[title="Eliminar vista · Delete view"]',
    );
    expect(deleteBtn).toBeTruthy();
    await userEvent.click(deleteBtn as HTMLElement);
    await waitFor(() => expect(screen.queryByText('Stored view')).not.toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem('gira_saved_views_GIRA') ?? '[]')).toHaveLength(0);
  });
});

describe('FilterBar — CSV export', () => {
  it('exports the filtered results to CSV with the project-prefixed name', async () => {
    issuesList.mockResolvedValue([
      issue({
        key: 'GIRA-9',
        title: 'Export me',
        type: 'bug',
        priority: 'urgent',
        statusName: 'Done',
        assignee: { id: 'u2', name: 'Grace Hopper' },
        storyPoints: 5,
        dueAt: '2026-08-15T10:00:00Z',
      }),
    ]);
    renderBar({ projectKey: 'GIRA' });

    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por prioridad · Filter by priority'),
      'urgent',
    );
    const csvBtn = await screen.findByRole('button', { name: 'CSV' });
    await userEvent.click(csvBtn);

    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [name, rows] = downloadCsv.mock.calls[0]!;
    expect(name).toBe('GIRA-incidencias');
    // Header row + one data row.
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('Key');
    expect(rows[1]).toEqual([
      'GIRA-9',
      'Export me',
      'bug',
      'urgent',
      'Done',
      'Grace Hopper',
      5,
      '2026-08-15',
    ]);
  });

  it('falls back to empty assignee/status/points/due when the issue lacks them', async () => {
    issuesList.mockResolvedValue([
      issue({
        key: 'GIRA-10',
        title: 'Bare issue',
        statusName: undefined,
        assignee: null,
        storyPoints: null,
        dueAt: null,
      }),
    ]);
    renderBar({ projectKey: 'GIRA' });
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por prioridad · Filter by priority'),
      'high',
    );
    await userEvent.click(await screen.findByRole('button', { name: 'CSV' }));
    const [, rows] = downloadCsv.mock.calls[0]!;
    expect(rows[1]).toEqual(['GIRA-10', 'Bare issue', 'task', 'high', '', '', '', '']);
  });
});
