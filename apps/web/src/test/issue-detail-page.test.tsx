// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
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

describe('IssueDetailPage', () => {
  beforeEach(() => {
    h.get.mockReset();
    h.cost.mockReset().mockResolvedValue({ minutes: 0, billableMinutes: 0, hourlyCents: 6000, accruedCents: 0, currency: 'EUR', billingMode: 'hourly' });
    h.commentsList.mockReset().mockResolvedValue([]);
    h.worklogsList.mockReset().mockResolvedValue([]);
    h.statusesList.mockReset().mockResolvedValue([{ id: 's1', name: 'Backlog', category: 'todo', order: 0 }]);
    h.labelsList.mockReset().mockResolvedValue([]);
    h.usersList.mockReset().mockResolvedValue([]);
    h.auditList.mockReset().mockResolvedValue({ count: 0, entries: [] });
  });

  it('renders the IssueDrawer for the routed issue key', async () => {
    h.get.mockResolvedValue(issue({ key: 'GIRA-1', title: 'Detail issue' }));
    renderWithProviders(
      <Routes>
        <Route path="/issues/:key" element={<IssueDetailPage />} />
      </Routes>,
      { route: '/issues/GIRA-1' },
    );
    expect(await screen.findByText('Detail issue')).toBeInTheDocument();
  });
});
