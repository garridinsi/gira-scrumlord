// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

const { list, create } = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn() }));
vi.mock('../api/client', () => ({
  projects: { list: () => list(), create: (d: unknown) => create(d) },
  ApiError: class ApiError extends Error {},
}));

import { ProjectsPage } from '../pages/ProjectsPage';

describe('ProjectsPage', () => {
  beforeEach(() => {
    list.mockReset();
    create.mockReset();
  });

  it('renders the project grid with keys, names, and the monthly badge', async () => {
    list.mockResolvedValue([
      { key: 'ALFA', name: 'Project Alfa', cadence: 'sprints', description: 'first one' },
      { key: 'BETA', name: 'Project Beta', cadence: 'monthly', description: null },
    ]);
    renderWithProviders(<ProjectsPage />);

    expect(await screen.findByText('Project Alfa')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
    expect(screen.getByText('ALFA')).toBeInTheDocument();
    expect(screen.getByText('MENSUAL')).toBeInTheDocument(); // monthly cadence plate
    expect(screen.getByText('first one')).toBeInTheDocument(); // description shown when present
  });

  it('shows the empty state when there are no projects', async () => {
    list.mockResolvedValue([]);
    renderWithProviders(<ProjectsPage />);
    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
  });

  it('opens the create form and submits a new project', async () => {
    list.mockResolvedValue([]);
    create.mockResolvedValue({ key: 'NEW', name: 'Newbie', cadence: 'sprints' });
    renderWithProviders(<ProjectsPage />);

    await userEvent.click(await screen.findByRole('button', { name: /\+ Proyecto/ }));
    await userEvent.type(screen.getByPlaceholderText('MTNR'), 'new'); // upper-cased on input
    await userEvent.type(screen.getByPlaceholderText('Nombre del proyecto'), 'Newbie');
    await userEvent.click(screen.getByRole('button', { name: /Crear/ }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]![0]).toMatchObject({ key: 'NEW', name: 'Newbie', cadence: 'sprints' });
  });
});
