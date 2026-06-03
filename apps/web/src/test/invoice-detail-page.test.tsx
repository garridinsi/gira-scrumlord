// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../api/client', () => ({
  invoices: {
    get: (id: string) => get(id),
    issue: vi.fn(),
    pay: vi.fn(),
    void: vi.fn(),
    delete: vi.fn(),
    setExternalRef: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: { role: 'admin' } }) }));

import { InvoiceDetailPage } from '../pages/InvoiceDetailPage';

const renderAt = (id: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
    </Routes>,
    { route: `/invoices/${id}` },
  );

describe('InvoiceDetailPage', () => {
  beforeEach(() => get.mockReset());

  it('renders the annex receipt for the loaded invoice', async () => {
    get.mockResolvedValue({
      id: 'inv1',
      number: 'ANX-2026-0001',
      status: 'draft',
      clientName: 'Acme Corp',
      currency: 'EUR',
      subtotalCents: 18000,
      periodStart: null,
      periodEnd: null,
      issuedAt: null,
      paidAt: null,
      createdAt: '2026-06-01T00:00:00Z',
      externalInvoiceRef: null,
      notes: null,
      lines: [{ id: 'l1', issueKey: 'GIRA-1', description: 'work', minutes: 60, hourlyCents: 6000, amountCents: 6000 }],
    });
    renderAt('inv1');
    expect(await screen.findByText('ANX-2026-0001')).toBeInTheDocument();
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('inv1');
  });
});
