// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './render';

vi.mock('../api/client', () => ({
  projects: { board: vi.fn(), backlog: vi.fn(), get: vi.fn(), sprints: { list: vi.fn() } },
  system: { health: vi.fn() },
}));

import { Rail } from '../components/layout/Rail';

describe('Rail', () => {
  it('renders the global nav items (no project key in scope)', () => {
    // Without a :key param the project-scoped queries are disabled; the global nav
    // items still render.
    renderWithProviders(<Rail open />);
    expect(screen.getByText('Facturación')).toBeInTheDocument(); // Billing
    expect(screen.getByText('Ajustes')).toBeInTheDocument(); // Settings
    expect(screen.getByText('Clientes')).toBeInTheDocument(); // Clients
  });
});
