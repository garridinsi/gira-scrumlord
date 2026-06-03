// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './render';

const { overview } = vi.hoisted(() => ({ overview: vi.fn() }));
vi.mock('../api/client', () => ({ portal: { overview: () => overview() } }));

import { PortalOverviewPage } from '../pages/portal/PortalOverviewPage';

const data = (over: Record<string, unknown> = {}) => ({
  totals: {
    open: 3,
    inProgress: 2,
    done: 5,
    totalMinutes: 120,
    accruedCents: 10000,
    currency: 'EUR',
  },
  projects: [
    {
      key: 'ALFA',
      name: 'Project Alfa',
      open: 1,
      inProgress: 1,
      done: 1,
      totalMinutes: 60,
      accruedCents: 5000,
    },
  ],
  client: { name: 'Acme Corp', currency: 'EUR' },
  ...over,
});

describe('PortalOverviewPage', () => {
  beforeEach(() => overview.mockReset());

  it('renders the client name, stat tiles, and project rollup cards', async () => {
    overview.mockResolvedValue(data());
    renderWithProviders(<PortalOverviewPage />);
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Devengado')).toBeInTheDocument(); // accrued tile
    expect(screen.getByText('Project Alfa')).toBeInTheDocument();
    expect(screen.getByText('ALFA')).toBeInTheDocument(); // rollup card key
  });

  it('shows the no-projects state when none are assigned', async () => {
    overview.mockResolvedValue(data({ projects: [] }));
    renderWithProviders(<PortalOverviewPage />);
    expect(await screen.findByText(/No projects assigned/i)).toBeInTheDocument();
  });

  it('renders an error state when the overview has no data', async () => {
    overview.mockResolvedValue(null);
    renderWithProviders(<PortalOverviewPage />);
    expect(await screen.findByText(/Could not load overview/i)).toBeInTheDocument();
  });
});
