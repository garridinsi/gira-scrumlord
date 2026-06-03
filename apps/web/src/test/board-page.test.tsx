// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import type { IssueView } from '@gira/shared';
import { renderWithProviders } from './render';

const { board, sprintsList, labelsList, incidentsList } = vi.hoisted(() => ({
  board: vi.fn(),
  sprintsList: vi.fn(),
  labelsList: vi.fn(),
  incidentsList: vi.fn(),
}));
vi.mock('../api/client', () => ({
  projects: {
    board: (k: string) => board(k),
    sprints: { list: (k: string) => sprintsList(k) },
    labels: { list: (k: string) => labelsList(k) },
  },
  issues: { create: vi.fn(), move: vi.fn(), get: vi.fn(), update: vi.fn() },
  incidents: { list: (f?: string) => incidentsList(f) },
  sprints: { start: vi.fn(), close: vi.fn() },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useProjectTabs', () => ({ useProjectTabs: () => [] }));

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

const renderAt = (key: string) =>
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
  });

  it('renders columns with their issue cards', async () => {
    board.mockResolvedValue({
      projectKey: 'PRJ',
      columns: [
        {
          status: { id: 's1', name: 'Backlog', category: 'todo', order: 0 },
          issues: [issue({ key: 'GIRA-1', title: 'Card one' })],
        },
        { status: { id: 's2', name: 'Done', category: 'done', order: 4 }, issues: [] },
      ],
    });
    renderAt('PRJ');

    expect(await screen.findByText('Card one')).toBeInTheDocument();
    expect(screen.getByText('GIRA-1')).toBeInTheDocument();
    expect(screen.getAllByText('Backlog').length).toBeGreaterThan(0); // column header
    expect(board).toHaveBeenCalledWith('PRJ');
  });
});
