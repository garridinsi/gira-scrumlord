// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for src/pages/IssueDetailPage.tsx. The sibling
// issue-detail-page.test.tsx only exercises the happy path (the drawer renders for
// a routed key). These cover the branches it leaves cold: the isError 404 state,
// the resolved-null `if (!data) return null` guard, and handleClose's
// `if (projectKey) navigate('/projects/<key>/board')` arm (driven by the drawer's
// onClose). The `else navigate(-1)` arm is unreachable through the only caller —
// the drawer only mounts when projectKey is truthy — so it is v8-ignored in source.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import type { IssueView } from '@gira/shared';
import { renderWithProviders } from './render';

// vi.hoisted so the hoisted vi.mock factories can close over the spies.
const { issueGet, navigateSpy } = vi.hoisted(() => ({
  issueGet: vi.fn(),
  navigateSpy: vi.fn(),
}));

vi.mock('../api/client', () => ({
  issues: { get: (k: string) => issueGet(k) },
}));

// Drawer stub with a working close button so we can fire IssueDetailPage's
// handleClose. The stub echoes its props so we can assert it received them.
vi.mock('../ui/IssueDrawer', () => ({
  IssueDrawer: ({
    issueKey,
    projectKey,
    onClose,
  }: {
    issueKey: string;
    projectKey: string;
    onClose: () => void;
  }) => (
    <div data-testid="issue-drawer">
      <span>
        drawer:{issueKey}:{projectKey}
      </span>
      <button type="button" onClick={onClose}>
        close-drawer
      </button>
    </div>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateSpy };
});

import { IssueDetailPage } from '../pages/IssueDetailPage';

const issue = (over: Partial<IssueView>): IssueView =>
  ({
    id: 'i1',
    key: 'GIRA-1',
    title: 'Detail issue',
    description: 'desc',
    type: 'task',
    priority: 'medium',
    statusId: 's1',
    statusCategory: 'todo',
    status: { id: 's1', name: 'Backlog', category: 'todo', order: 0 },
    labels: [],
    assignee: null,
    reporter: { id: 'u1', name: 'Reporter' },
    storyPoints: null,
    estimateMinutes: null,
    dueAt: null,
    billingMode: 'hourly',
    fixedPriceCents: null,
    loggedMinutes: 0,
    sprintId: null,
    projectKey: 'PRJ',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
    ...over,
  }) as unknown as IssueView;

const renderAt = (key: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/issues/:key" element={<IssueDetailPage />} />
    </Routes>,
    { route: `/issues/${key}` },
  );

describe('IssueDetailPage (coverage)', () => {
  beforeEach(() => {
    issueGet.mockReset();
    navigateSpy.mockReset();
  });

  it('renders the 404 / not-found state when the issue query errors', async () => {
    issueGet.mockRejectedValue(new Error('boom'));
    renderAt('NOPE-1');

    // Plate (tone=red) renders the heading; the <p> echoes the routed key.
    expect(await screen.findByText('404 · NO ENCONTRADO')).toBeInTheDocument();
    expect(screen.getByText('Ticket no encontrado · Issue not found: NOPE-1')).toBeInTheDocument();
    // Neither the drawer nor the loading text is on screen in the error state.
    expect(screen.queryByTestId('issue-drawer')).not.toBeInTheDocument();
    expect(screen.queryByText('cargando ticket · loading issue')).not.toBeInTheDocument();
  });

  it('returns null when the issue query resolves to no data', async () => {
    issueGet.mockResolvedValue(null);
    const { container } = renderAt('GIRA-1');

    // The query settles (loading text gone) but `if (!data) return null` short-circuits
    // before the page body — so nothing from the page is rendered.
    await waitFor(() =>
      expect(screen.queryByText('cargando ticket · loading issue')).not.toBeInTheDocument(),
    );
    expect(screen.queryByTestId('issue-drawer')).not.toBeInTheDocument();
    expect(screen.queryByText('404 · NO ENCONTRADO')).not.toBeInTheDocument();
    expect(container.querySelector('.body')).toBeNull();
  });

  it('renders the drawer with the derived project key and navigates to the board on close', async () => {
    issueGet.mockResolvedValue(issue({ key: 'GIRA-1', projectKey: 'PRJ' }));
    renderAt('GIRA-1');

    const drawer = await screen.findByTestId('issue-drawer');
    expect(drawer).toHaveTextContent('drawer:GIRA-1:PRJ');

    // handleClose: projectKey is truthy → navigate('/projects/PRJ/board').
    await userEvent.click(screen.getByRole('button', { name: 'close-drawer' }));
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/projects/PRJ/board'));
  });
});
