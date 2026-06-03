// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

const { projectsList, incidentsList } = vi.hoisted(() => ({ projectsList: vi.fn(), incidentsList: vi.fn() }));
vi.mock('../api/client', () => ({
  projects: { list: () => projectsList() },
  incidents: { list: (f?: string) => incidentsList(f) },
}));
vi.mock('../hooks/useAuth', () => ({
  useMe: () => ({ data: { id: 'u1', name: 'Ada Lovelace', role: 'admin' } }),
  useLogout: () => ({ mutate: vi.fn() }),
}));

import { TopBar } from '../components/layout/TopBar';

describe('TopBar', () => {
  beforeEach(() => {
    projectsList.mockReset();
    incidentsList.mockReset();
  });

  it('renders the brand and opens the project picker with the loaded projects', async () => {
    projectsList.mockResolvedValue([
      { key: 'ALFA', name: 'Alfa' },
      { key: 'BETA', name: 'Beta' },
    ]);
    incidentsList.mockResolvedValue([]);
    renderWithProviders(<TopBar />);

    expect(screen.getByText('gira-scrumlord')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Pick a project/i }));
    expect(await screen.findByText('ALFA')).toBeInTheDocument();
    expect(screen.getByText('BETA')).toBeInTheDocument();
  });
});
