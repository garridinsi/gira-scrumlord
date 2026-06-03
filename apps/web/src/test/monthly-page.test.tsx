// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

const { projectGet, projectMonthly, generate } = vi.hoisted(() => ({
  projectGet: vi.fn(),
  projectMonthly: vi.fn(),
  generate: vi.fn(),
}));
vi.mock('../api/client', () => ({
  projects: { get: (k: string) => projectGet(k), monthly: (k: string) => projectMonthly(k) },
  invoices: { generate: (c: string, b: unknown) => generate(c, b) },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: { role: 'admin' } }) }));
vi.mock('../hooks/useProjectTabs', () => ({ useProjectTabs: () => [] }));

import { MonthlyPage } from '../pages/MonthlyPage';

function renderAt(key: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:key/monthly" element={<MonthlyPage />} />
    </Routes>,
    { route: `/projects/${key}/monthly` },
  );
}

describe('MonthlyPage', () => {
  beforeEach(() => {
    projectGet.mockReset();
    projectMonthly.mockReset();
    generate.mockReset();
  });

  it('renders the monthly maintenance rollup with localized month rows and a budget', async () => {
    projectGet.mockResolvedValue({ key: 'MNT', name: 'Maint', clientId: 'c1' });
    projectMonthly.mockResolvedValue({
      currency: 'EUR',
      budgetMinutes: 2400,
      budgetCents: 240000,
      months: [
        { month: '2026-05', billableMinutes: 120, totalMinutes: 150, accruedCents: 12000 },
        { month: '2026-04', billableMinutes: 60, totalMinutes: 60, accruedCents: 6000 },
      ],
    });
    renderAt('MNT');

    expect(await screen.findByText('MAYO 2026')).toBeInTheDocument();
    expect(screen.getByText('ABRIL 2026')).toBeInTheDocument();
    expect(screen.getByText(/Mantenimiento Mensual/)).toBeInTheDocument();
    expect(projectMonthly).toHaveBeenCalledWith('MNT');
  });
});
