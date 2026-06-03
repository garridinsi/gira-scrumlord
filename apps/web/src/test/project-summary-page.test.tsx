// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

const { summary, sprintsList, projectGet, update, clientsList } = vi.hoisted(() => ({
  summary: vi.fn(),
  sprintsList: vi.fn(),
  projectGet: vi.fn(),
  update: vi.fn(),
  clientsList: vi.fn(),
}));
vi.mock('../api/client', () => ({
  projects: {
    summary: (k: string) => summary(k),
    sprints: { list: (k: string) => sprintsList(k) },
    get: (k: string) => projectGet(k),
    update: (k: string, b: unknown) => update(k, b),
  },
  clients: { list: () => clientsList() },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: { role: 'admin' } }) }));
vi.mock('../hooks/useProjectTabs', () => ({ useProjectTabs: () => [] }));

import { ProjectSummaryPage } from '../pages/ProjectSummaryPage';

const renderAt = (key: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/projects/:key/summary" element={<ProjectSummaryPage />} />
    </Routes>,
    { route: `/projects/${key}/summary` },
  );

describe('ProjectSummaryPage', () => {
  beforeEach(() => {
    summary.mockReset();
    sprintsList.mockReset().mockResolvedValue([]);
    projectGet.mockReset().mockResolvedValue({
      key: 'PRJ',
      name: 'My Project',
      clientId: null,
      monthlyBudgetMinutes: null,
      monthlyBudgetCents: null,
      cadence: 'sprints',
    });
    update.mockReset();
    clientsList.mockReset().mockResolvedValue([]);
  });

  it('renders the project summary (currency pill) once data loads', async () => {
    summary.mockResolvedValue({
      projectKey: 'PRJ',
      currency: 'EUR',
      totalMinutes: 120,
      billableMinutes: 120,
      accruedCents: 12000,
      openIssues: 7,
      doneIssues: 9,
      activeSprint: null,
    });
    renderAt('PRJ');

    expect(await screen.findByText('MONEDA')).toBeInTheDocument();
    expect(summary).toHaveBeenCalledWith('PRJ');
  });
});
