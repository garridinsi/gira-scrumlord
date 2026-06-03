// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

const { sprintsList, sprintsCreate, start, close } = vi.hoisted(() => ({
  sprintsList: vi.fn(),
  sprintsCreate: vi.fn(),
  start: vi.fn(),
  close: vi.fn(),
}));
vi.mock('../api/client', () => ({
  projects: { sprints: { list: (k: string) => sprintsList(k), create: (k: string, b: unknown) => sprintsCreate(k, b) } },
  sprints: { start: (id: string) => start(id), close: (id: string) => close(id) },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useProjectTabs', () => ({ useProjectTabs: () => [] }));

import { SprintsPage } from '../pages/SprintsPage';

const sprint = (over: Record<string, unknown>) => ({
  id: 's1',
  name: 'Sprint 1',
  state: 'active',
  goal: 'ship it',
  startDate: null,
  endDate: null,
  committedPoints: 10,
  completedPoints: 5,
  velocity: { totalPoints: 10, completedPoints: 5, completedCount: 1, totalCount: 2 },
  ...over,
});

function renderAt(key: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:key/sprints" element={<SprintsPage />} />
    </Routes>,
    { route: `/projects/${key}/sprints` },
  );
}

describe('SprintsPage', () => {
  beforeEach(() => {
    sprintsList.mockReset();
    sprintsCreate.mockReset();
    start.mockReset();
    close.mockReset();
  });

  it('renders sprints grouped by state (active / future / closed)', async () => {
    sprintsList.mockResolvedValue([
      sprint({ id: 's1', name: 'Active One', state: 'active' }),
      sprint({ id: 's2', name: 'Future One', state: 'future' }),
      sprint({ id: 's3', name: 'Closed One', state: 'closed' }),
    ]);
    renderAt('PRJ');
    expect(await screen.findByText('Active One')).toBeInTheDocument();
    expect(screen.getByText('Future One')).toBeInTheDocument();
    expect(screen.getByText('Closed One')).toBeInTheDocument();
    expect(sprintsList).toHaveBeenCalledWith('PRJ');
  });

  it('shows the create-first-sprint empty state', async () => {
    sprintsList.mockResolvedValue([]);
    renderAt('PRJ');
    expect(await screen.findByText(/Create the first sprint/i)).toBeInTheDocument();
  });
});
