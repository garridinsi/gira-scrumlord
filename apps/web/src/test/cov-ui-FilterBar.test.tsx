// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for src/ui/FilterBar.tsx. These exercise branches the
// sibling filter-bar.test.tsx leaves cold:
//   - saveSavedViews try/catch when localStorage.setItem throws (lines 102, 104)
//   - saveCurrentView's empty-name early return via Enter on a blank input (line 226)
//   - the `null` (falsy) arm of each select's `e.target.value || null` handler when
//     the empty option is re-selected (lines 296, 311, 326, 341)
//   - the CSV export onClick (line 398)
//   - the assignee chip label fallback `?? filter.assigneeId` when the active
//     assignee id is not present in the loaded user list (line 446)
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IssueView, LabelView, UserView } from '@gira/shared';
import { renderWithProviders } from './render';

// ── Mocks (mirror the sibling filter-bar.test.tsx exactly) ───────────────────────
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
  props?: Partial<{
    projectKey: string;
    myId: string | null;
    onResults: Mock<(issues: IssueView[] | null) => void>;
  }>,
) {
  const onResults = props?.onResults ?? vi.fn<(issues: IssueView[] | null) => void>();
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
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('FilterBar coverage — select null-reset arms', () => {
  it('re-selecting the empty assignee option resets the filter to null (line 296)', async () => {
    issuesList.mockResolvedValue([]);
    renderBar();
    await screen.findByRole('option', { name: 'Grace Hopper' });

    const assignee = screen.getByLabelText('Filtrar por asignado · Filter by assignee');
    await userEvent.selectOptions(assignee, 'u2');
    await waitFor(() => expect(chip('Grace Hopper')).toBeInTheDocument());

    // Re-select the empty option: `e.target.value || null` => null arm.
    await userEvent.selectOptions(assignee, '');
    await waitFor(() =>
      expect(
        screen.getAllByText('Grace Hopper').filter((el) => el.tagName !== 'OPTION'),
      ).toHaveLength(0),
    );
  });

  it('re-selecting the empty type option resets the filter to null (line 311)', async () => {
    issuesList.mockResolvedValue([]);
    renderBar();
    const type = screen.getByLabelText('Filtrar por tipo · Filter by type');
    await userEvent.selectOptions(type, 'bug');
    await waitFor(() => expect(chip('bug')).toBeInTheDocument());

    await userEvent.selectOptions(type, '');
    await waitFor(() =>
      expect(screen.getAllByText('bug').filter((el) => el.tagName !== 'OPTION')).toHaveLength(0),
    );
  });

  it('re-selecting the empty priority option resets the filter to null (line 326)', async () => {
    issuesList.mockResolvedValue([]);
    renderBar();
    const priority = screen.getByLabelText('Filtrar por prioridad · Filter by priority');
    await userEvent.selectOptions(priority, 'urgent');
    await waitFor(() => expect(chip('urgent')).toBeInTheDocument());

    await userEvent.selectOptions(priority, '');
    await waitFor(() =>
      expect(screen.getAllByText('urgent').filter((el) => el.tagName !== 'OPTION')).toHaveLength(0),
    );
  });

  it('re-selecting the empty label option resets the filter to null (line 341)', async () => {
    issuesList.mockResolvedValue([]);
    renderBar();
    await screen.findByRole('option', { name: 'backend' });
    const lbl = screen.getByLabelText('Filtrar por etiqueta · Filter by label');
    await userEvent.selectOptions(lbl, 'l2');
    // Label chip renders the label name inside LabelChipWithClear.
    await waitFor(() => expect(chip('backend')).toBeInTheDocument());

    await userEvent.selectOptions(lbl, '');
    await waitFor(() =>
      expect(screen.getAllByText('backend').filter((el) => el.tagName !== 'OPTION')).toHaveLength(
        0,
      ),
    );
  });
});

describe('FilterBar coverage — saveCurrentView guard & localStorage failure', () => {
  it('pressing Enter with a blank name early-returns without saving (line 226)', async () => {
    issuesList.mockResolvedValue([]);
    renderBar({ projectKey: 'GIRA' });
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por tipo · Filter by type'),
      'task',
    );
    await userEvent.click(await screen.findByRole('button', { name: /Guardar vista · Save view/ }));
    const input = await screen.findByPlaceholderText('Nombre de vista · View name');

    // Type only whitespace, then Enter: saveCurrentView runs but `name` is falsy → early return.
    await userEvent.type(input, '   {Enter}');

    // Nothing persisted; the save input is still open (showSaveInput unchanged).
    expect(JSON.parse(localStorage.getItem('gira_saved_views_GIRA') ?? '[]')).toHaveLength(0);
    expect(screen.getByPlaceholderText('Nombre de vista · View name')).toBeInTheDocument();
  });

  it('swallows a throwing localStorage.setItem when saving a view (lines 102, 104)', async () => {
    issuesList.mockResolvedValue([]);
    renderBar({ projectKey: 'GIRA' });
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por prioridad · Filter by priority'),
      'medium',
    );
    await userEvent.click(await screen.findByRole('button', { name: /Guardar vista · Save view/ }));
    const nameInput = await screen.findByPlaceholderText('Nombre de vista · View name');

    // Force the persist to throw (e.g. private mode / quota). The component must not crash.
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });

    await userEvent.type(nameInput, 'Doomed view');
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));

    // setItem was attempted (entering the try) and the catch swallowed the throw:
    // the in-memory pill still renders despite the failed persist.
    expect(setItemSpy).toHaveBeenCalled();
    expect(await screen.findByText('Doomed view')).toBeInTheDocument();
  });
});

describe('FilterBar coverage — CSV export & assignee chip fallback', () => {
  it('clicking CSV exports the current filtered results (line 398)', async () => {
    issuesList.mockResolvedValue([issue({ key: 'GIRA-7', title: 'Export this' })]);
    renderBar({ projectKey: 'GIRA' });
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por prioridad · Filter by priority'),
      'high',
    );
    await userEvent.click(await screen.findByRole('button', { name: 'CSV' }));

    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [name] = downloadCsv.mock.calls[0]!;
    expect(name).toBe('GIRA-incidencias');
  });

  it('falls back to the raw assignee id when no matching user is loaded (line 446)', async () => {
    // myId is an id that is NOT present in USERS, so the "Assigned to me" builtin
    // applies an assigneeId the user list can't resolve → chip shows the raw id.
    issuesList.mockResolvedValue([]);
    renderBar({ myId: 'ghost-id' });

    const mine = await screen.findByText('Asignadas a mí · Assigned to me');
    await userEvent.click(mine);

    // userList.find(...)?.name is undefined → `?? filter.assigneeId` renders the id.
    await waitFor(() => expect(chip('ghost-id')).toBeInTheDocument());
  });
});
