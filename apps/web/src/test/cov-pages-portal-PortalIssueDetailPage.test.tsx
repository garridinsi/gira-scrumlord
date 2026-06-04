// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for PortalIssueDetailPage: status-class branches,
// loading / 404 / error states, empty-vs-present cost, comments and sidebar
// branches, and the add-comment mutation success + error paths.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

// vi.hoisted so the hoisted vi.mock factories can close over the spies.
const { issueGet, cost, commentsList, commentCreate, toastSpy, navigateSpy } = vi.hoisted(() => ({
  issueGet: vi.fn(),
  cost: vi.fn(),
  commentsList: vi.fn(),
  commentCreate: vi.fn(),
  toastSpy: vi.fn(),
  navigateSpy: vi.fn(),
}));

vi.mock('../api/client', () => ({
  issues: {
    get: (k: string) => issueGet(k),
    cost: (k: string) => cost(k),
    comments: {
      list: (k: string) => commentsList(k),
      create: (k: string, b: unknown) => commentCreate(k, b),
    },
  },
}));

vi.mock('../ui/Toast', () => ({ useToast: () => toastSpy }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateSpy };
});

import { PortalIssueDetailPage } from '../pages/portal/PortalIssueDetailPage';

const renderAt = (key: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/portal/issues/:key" element={<PortalIssueDetailPage />} />
    </Routes>,
    { route: `/portal/issues/${key}` },
  );

// A baseline issue with the optional branches present (assignee, story points,
// estimate, label, in_progress status) so the corresponding JSX renders.
function fullIssue(over: Record<string, unknown> = {}) {
  return {
    key: 'GIRA-7',
    projectKey: 'GIRA',
    title: 'Full issue',
    type: 'bug',
    priority: 'high',
    statusName: 'In Progress',
    statusCategory: 'in_progress',
    labels: [{ id: 'l1', name: 'backend', color: '#112233' }],
    description: 'detailed description',
    assignee: { id: 'u9', name: 'Grace Hopper' },
    storyPoints: 5,
    estimateMinutes: 90,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
    ...over,
  };
}

describe('PortalIssueDetailPage (coverage)', () => {
  beforeEach(() => {
    issueGet.mockReset();
    cost.mockReset();
    commentsList.mockReset();
    commentCreate.mockReset();
    toastSpy.mockReset();
    navigateSpy.mockReset();
  });

  it('shows the loading state while the issue query is pending', () => {
    issueGet.mockReturnValue(new Promise(() => {})); // never resolves
    cost.mockReturnValue(new Promise(() => {}));
    commentsList.mockReturnValue(new Promise(() => {}));
    renderAt('GIRA-7');
    expect(screen.getByText('cargando ticket · loading issue')).toBeInTheDocument();
  });

  it('renders the 404 / not-found state when the issue query errors', async () => {
    issueGet.mockRejectedValue(new Error('boom'));
    cost.mockResolvedValue(null);
    commentsList.mockResolvedValue([]);
    renderAt('NOPE-1');

    expect(await screen.findByText('404 · No encontrado · Not found')).toBeInTheDocument();
    expect(
      screen.getByText('Ticket NOPE-1 no existe · Issue NOPE-1 not found'),
    ).toBeInTheDocument();
  });

  it('renders the in_progress status pill, assignee, points, estimate, and label', async () => {
    issueGet.mockResolvedValue(fullIssue());
    // Distinct minute values so each formatMinutes output is unique in the DOM:
    // total 120m → "2h", billable 45m → "45m", estimate 90m → "1h 30m".
    cost.mockResolvedValue({
      minutes: 120,
      billableMinutes: 45,
      accruedCents: 9000,
      currency: 'EUR',
    });
    commentsList.mockResolvedValue([]);
    renderAt('GIRA-7');

    // statusClass in_progress branch
    const status = await screen.findByText('In Progress');
    expect(status.className).toContain('cp-detail__status--in_progress');
    // sidebar branches
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('5 pts')).toBeInTheDocument(); // story points
    expect(screen.getByText('1h 30m')).toBeInTheDocument(); // estimate 90m
    expect(screen.getByText('45m')).toBeInTheDocument(); // billable time
    expect(screen.getByText('backend')).toBeInTheDocument(); // label chip
    // project key in sidebar
    expect(screen.getByText('GIRA')).toBeInTheDocument();
    // cost box resolved branch
    expect(screen.getByText('Tiempo total · Total time')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument(); // 120m total time
    // formatMoney(9000, 'EUR') → es-ES style, code-prefixed, comma decimals.
    expect(screen.getByText('EUR 90,00')).toBeInTheDocument(); // accrued
  });

  it('renders the done status pill', async () => {
    issueGet.mockResolvedValue(fullIssue({ statusName: 'Done', statusCategory: 'done' }));
    cost.mockResolvedValue(null);
    commentsList.mockResolvedValue([]);
    renderAt('GIRA-7');

    const status = await screen.findByText('Done');
    expect(status.className).toContain('cp-detail__status--done');
  });

  it('renders the empty states: no description, no cost, no assignee, no comments', async () => {
    issueGet.mockResolvedValue(
      fullIssue({
        description: null,
        assignee: null,
        storyPoints: null,
        estimateMinutes: 0,
        labels: [],
        statusName: null,
      }),
    );
    cost.mockResolvedValue(null);
    commentsList.mockResolvedValue([]);
    renderAt('GIRA-7');

    expect(await screen.findByText('Sin descripción · No description')).toBeInTheDocument();
    expect(screen.getByText('Sin asignar · Unassigned')).toBeInTheDocument();
    expect(screen.getByText('Sin comentarios · No comments yet')).toBeInTheDocument();
    // No cost and not loading → cost box absent.
    expect(screen.queryByText('Tiempo y coste · Time & cost')).not.toBeInTheDocument();
    // No story points / estimate / status pill.
    expect(screen.queryByText('5 pts')).not.toBeInTheDocument();
  });

  it('shows the cost box loading spinner while the cost query is pending', async () => {
    issueGet.mockResolvedValue(fullIssue({ description: null }));
    cost.mockReturnValue(new Promise(() => {})); // cost stays loading
    commentsList.mockResolvedValue([]);
    renderAt('GIRA-7');

    await screen.findByText('Sin descripción · No description');
    expect(screen.getByText('Tiempo y coste · Time & cost')).toBeInTheDocument();
    // The loading spinner inside the cost box (cost is loading → enabled box).
    expect(screen.getAllByText('cargando · loading').length).toBeGreaterThan(0);
  });

  it('renders a comment with an author and its count badge', async () => {
    issueGet.mockResolvedValue(fullIssue());
    cost.mockResolvedValue(null);
    commentsList.mockResolvedValue([
      {
        id: 'c1',
        body: 'looking into it',
        author: { id: 'u1', name: 'Ada Lovelace' },
        createdAt: '2026-06-01T00:00:00Z',
      },
    ]);
    renderAt('GIRA-7');

    expect(await screen.findByText('looking into it')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('does not submit when the comment body is only whitespace', async () => {
    issueGet.mockResolvedValue(fullIssue());
    cost.mockResolvedValue(null);
    commentsList.mockResolvedValue([]);
    renderAt('GIRA-7');

    const textarea = await screen.findByLabelText('Añadir comentario · Add comment');
    // Type whitespace; the submit button stays disabled (trim() is empty),
    // so fire the form submit directly to hit the early-return guard.
    await userEvent.type(textarea, '   ');
    const form = textarea.closest('form')!;
    fireEvent.submit(form);

    expect(commentCreate).not.toHaveBeenCalled();
  });

  it('submits a comment and fires the success toast', async () => {
    issueGet.mockResolvedValue(fullIssue());
    cost.mockResolvedValue(null);
    commentsList.mockResolvedValue([]);
    commentCreate.mockResolvedValue({
      id: 'new',
      body: 'fresh take',
      author: { id: 'u1', name: 'Ada' },
      createdAt: '2026-06-03T00:00:00Z',
    });
    renderAt('GIRA-7');

    const textarea = await screen.findByLabelText('Añadir comentario · Add comment');
    await userEvent.type(textarea, '  fresh take  ');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar · Submit' }));

    await waitFor(() =>
      expect(commentCreate).toHaveBeenCalledWith('GIRA-7', {
        body: 'fresh take',
        visibility: 'client',
      }),
    );
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Comentario añadido · Comment added' }),
      ),
    );
    // onSuccess clears the textarea.
    await waitFor(() => expect((textarea as HTMLTextAreaElement).value).toBe(''));
  });

  it('fires the danger toast when adding a comment fails', async () => {
    issueGet.mockResolvedValue(fullIssue());
    cost.mockResolvedValue(null);
    commentsList.mockResolvedValue([]);
    commentCreate.mockRejectedValue(new Error('server exploded'));
    renderAt('GIRA-7');

    const textarea = await screen.findByLabelText('Añadir comentario · Add comment');
    await userEvent.type(textarea, 'will fail');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar · Submit' }));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al comentar · Comment failed',
          body: 'server exploded',
        }),
      ),
    );
  });

  it('navigates back to the portal issue list on Back', async () => {
    issueGet.mockResolvedValue(fullIssue());
    cost.mockResolvedValue(null);
    commentsList.mockResolvedValue([]);
    renderAt('GIRA-7');

    await userEvent.click(await screen.findByText('← Volver · Back'));
    expect(navigateSpy).toHaveBeenCalledWith('/portal/issues');
  });
});
