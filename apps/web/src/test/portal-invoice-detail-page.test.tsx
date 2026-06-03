// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

const { invoice } = vi.hoisted(() => ({ invoice: vi.fn() }));
vi.mock('../api/client', () => ({
  portal: { invoice: (id: string) => invoice(id) },
  ApiError: class ApiError extends Error {},
}));

import { PortalInvoiceDetailPage } from '../pages/portal/PortalInvoiceDetailPage';

const renderAt = (id: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/portal/invoices/:id" element={<PortalInvoiceDetailPage />} />
    </Routes>,
    { route: `/portal/invoices/${id}` },
  );

describe('PortalInvoiceDetailPage', () => {
  beforeEach(() => invoice.mockReset());

  it('renders the annex receipt for the loaded invoice', async () => {
    invoice.mockResolvedValue({
      id: 'inv1',
      number: 'ANX-2026-0001',
      status: 'issued',
      clientName: 'Acme Corp',
      currency: 'EUR',
      subtotalCents: 18000,
      periodStart: null,
      periodEnd: null,
      issuedAt: '2026-06-01T00:00:00Z',
      paidAt: null,
      createdAt: '2026-06-01T00:00:00Z',
      externalInvoiceRef: null,
      notes: null,
      lines: [
        {
          id: 'l1',
          issueKey: 'GIRA-1',
          description: 'work',
          minutes: 60,
          hourlyCents: 6000,
          amountCents: 6000,
        },
      ],
    });
    renderAt('inv1');
    expect(await screen.findByText('ANX-2026-0001')).toBeInTheDocument();
    expect(invoice).toHaveBeenCalledWith('inv1');
  });
});
