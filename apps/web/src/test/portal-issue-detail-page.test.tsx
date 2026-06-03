// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

const { issueGet, cost, commentsList, commentCreate } = vi.hoisted(() => ({
  issueGet: vi.fn(),
  cost: vi.fn(),
  commentsList: vi.fn(),
  commentCreate: vi.fn(),
}));
vi.mock('../api/client', () => ({
  issues: {
    get: (k: string) => issueGet(k),
    cost: (k: string) => cost(k),
    comments: { list: (k: string) => commentsList(k), create: (k: string, b: unknown) => commentCreate(k, b) },
  },
}));

import { PortalIssueDetailPage } from '../pages/portal/PortalIssueDetailPage';

const renderAt = (key: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/portal/issues/:key" element={<PortalIssueDetailPage />} />
    </Routes>,
    { route: `/portal/issues/${key}` },
  );

describe('PortalIssueDetailPage', () => {
  beforeEach(() => {
    issueGet.mockReset();
    cost.mockReset();
    commentsList.mockReset();
    commentCreate.mockReset();
  });

  it('renders the issue detail, key, and its comments', async () => {
    issueGet.mockResolvedValue({
      key: 'GIRA-1',
      title: 'Portal issue',
      type: 'task',
      priority: 'medium',
      statusName: 'To Do',
      statusCategory: 'todo',
      labels: [],
      description: 'something is broken',
      assignee: null,
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-02T00:00:00Z',
      dueAt: null,
    });
    cost.mockResolvedValue({ billableMinutes: 60, accruedCents: 6000, currency: 'EUR' });
    commentsList.mockResolvedValue([
      { id: 'c1', body: 'we are on it', author: { id: 'u1', name: 'Ada' }, createdAt: '2026-06-01T00:00:00Z' },
    ]);
    renderAt('GIRA-1');

    expect(await screen.findByText('Portal issue')).toBeInTheDocument();
    expect(screen.getByText('GIRA-1')).toBeInTheDocument();
    expect(screen.getByText('we are on it')).toBeInTheDocument(); // a comment
    expect(issueGet).toHaveBeenCalledWith('GIRA-1');
  });
});
