// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import type { IssueView } from '@gira/shared';
import { renderWithProviders } from './render';

const { backlog, sprintsList, labelsList, usersList, issuesList } = vi.hoisted(() => ({
  backlog: vi.fn(),
  sprintsList: vi.fn(),
  labelsList: vi.fn(),
  usersList: vi.fn(),
  issuesList: vi.fn(),
}));
vi.mock('../api/client', () => ({
  issues: { list: (f?: unknown) => issuesList(f) },
  projects: {
    backlog: (k: string) => backlog(k),
    sprints: { list: (k: string) => sprintsList(k) },
    labels: { list: (k: string) => labelsList(k) },
  },
  sprints: { start: vi.fn(), close: vi.fn() },
  users: { list: () => usersList() },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: { id: 'u1', role: 'admin' } }) }));
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
    labelsList.mockReset().mockResolvedValue([]);
    usersList.mockReset().mockResolvedValue([]);
    issuesList.mockReset().mockResolvedValue([]);
  });

  it('renders the backlog issues for the project', async () => {
    backlog.mockResolvedValue([
      issue({ id: 'i1', key: 'GIRA-1', title: 'First backlog item' }),
      issue({ id: 'i2', key: 'GIRA-2', title: 'Second backlog item' }),
    ]);
    renderAt('PRJ');

    expect(await screen.findByText('First backlog item')).toBeInTheDocument();
    expect(screen.getByText('Second backlog item')).toBeInTheDocument();
    expect(backlog).toHaveBeenCalledWith('PRJ');
  });
});
