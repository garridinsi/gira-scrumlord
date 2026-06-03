// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IssueView } from '@gira/shared';
import { renderWithProviders } from './render';

const h = vi.hoisted(() => ({
  get: vi.fn(),
  cost: vi.fn(),
  commentsList: vi.fn(),
  worklogsList: vi.fn(),
  statusesList: vi.fn(),
  labelsList: vi.fn(),
  usersList: vi.fn(),
  auditList: vi.fn(),
}));
vi.mock('../api/client', () => ({
  issues: {
    get: (k: string) => h.get(k),
    cost: (k: string) => h.cost(k),
    update: vi.fn(),
    move: vi.fn(),
    comments: { list: (k: string) => h.commentsList(k), create: vi.fn() },
    worklogs: { list: (k: string) => h.worklogsList(k), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
  projects: { statuses: { list: (k: string) => h.statusesList(k) }, labels: { list: (k: string) => h.labelsList(k) } },
  users: { list: () => h.usersList() },
  audit: { list: () => h.auditList() },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useTimer', () => ({
  useActiveTimer: () => ({ data: null }),
  useStartTimer: () => ({ mutate: vi.fn(), isPending: false }),
  useStopTimer: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { IssueDrawer } from '../ui/IssueDrawer';

const issue = (over: Partial<IssueView>): IssueView =>
  ({
    id: 'i1',
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

describe('IssueDrawer', () => {
  beforeEach(() => {
    h.get.mockReset();
    h.cost.mockReset().mockResolvedValue({ minutes: 60, billableMinutes: 60, hourlyCents: 6000, accruedCents: 6000, currency: 'EUR', billingMode: 'hourly' });
    h.commentsList.mockReset().mockResolvedValue([]);
    h.worklogsList.mockReset().mockResolvedValue([]);
    h.statusesList.mockReset().mockResolvedValue([{ id: 's1', name: 'Backlog', category: 'todo', order: 0 }]);
    h.labelsList.mockReset().mockResolvedValue([]);
    h.usersList.mockReset().mockResolvedValue([]);
    h.auditList.mockReset().mockResolvedValue({ count: 0, entries: [] });
  });

  it('loads and renders the issue (title + key) in the details tab', async () => {
    h.get.mockResolvedValue(issue({ key: 'GIRA-1', title: 'My issue title' }));
    renderWithProviders(<IssueDrawer issueKey="GIRA-1" projectKey="PRJ" onClose={vi.fn()} />);

    expect(await screen.findByText('My issue title')).toBeInTheDocument();
    expect(screen.getByText('GIRA-1')).toBeInTheDocument();
    expect(h.get).toHaveBeenCalledWith('GIRA-1');
  });

  it('switches to the Comments tab and loads comments', async () => {
    h.get.mockResolvedValue(issue({}));
    renderWithProviders(<IssueDrawer issueKey="GIRA-1" projectKey="PRJ" onClose={vi.fn()} />);
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Comentarios'));
    await waitFor(() => expect(h.commentsList).toHaveBeenCalledWith('GIRA-1'));
  });

  it('switches to the Worklogs tab and loads worklogs', async () => {
    h.get.mockResolvedValue(issue({}));
    renderWithProviders(<IssueDrawer issueKey="GIRA-1" projectKey="PRJ" onClose={vi.fn()} />);
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await waitFor(() => expect(h.worklogsList).toHaveBeenCalledWith('GIRA-1'));
  });

  it('exposes an ARIA tablist and an accessible (keyboard) close button', async () => {
    h.get.mockResolvedValue(issue({}));
    const onClose = vi.fn();
    renderWithProviders(<IssueDrawer issueKey="GIRA-1" projectKey="PRJ" onClose={onClose} />);
    await screen.findByText('My issue title');

    expect(screen.getAllByRole('tab').length).toBeGreaterThanOrEqual(3); // G3: tabs are an ARIA tablist
    await userEvent.click(screen.getByRole('button', { name: /Cerrar · Close/ })); // G3: real button, not a span
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
