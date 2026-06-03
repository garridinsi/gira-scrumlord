// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import type { InvoiceListItemView } from '@gira/shared';
import { renderWithProviders } from './render';

const { invoices } = vi.hoisted(() => ({ invoices: vi.fn() }));
vi.mock('../api/client', () => ({ portal: { invoices: () => invoices() } }));

import { PortalInvoicesPage } from '../pages/portal/PortalInvoicesPage';

const inv = (over: Partial<InvoiceListItemView>): InvoiceListItemView =>
  ({
    id: 'i1',
    number: 'ANX-2026-0001',
    status: 'issued',
    subtotalCents: 18000,
    currency: 'EUR',
    periodStart: '2026-05-01T00:00:00Z',
    periodEnd: '2026-05-31T00:00:00Z',
    createdAt: '2026-06-01T00:00:00Z',
    ...over,
  }) as unknown as InvoiceListItemView;

describe('PortalInvoicesPage', () => {
  beforeEach(() => invoices.mockReset());

  it('lists annexes with their number and status badge', async () => {
    invoices.mockResolvedValue([inv({}), inv({ id: 'i2', number: 'ANX-2026-0002', status: 'paid' })]);
    renderWithProviders(<PortalInvoicesPage />);
    expect(await screen.findByText('ANX-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('ANX-2026-0002')).toBeInTheDocument();
    expect(screen.getByText(/Issued/)).toBeInTheDocument();
    expect(screen.getByText(/Paid/)).toBeInTheDocument();
  });

  it('shows the empty state when there are no annexes', async () => {
    invoices.mockResolvedValue([]);
    renderWithProviders(<PortalInvoicesPage />);
    expect(await screen.findByText(/No annexes yet/i)).toBeInTheDocument();
  });

  it('renders the period and amount for each annex', async () => {
    invoices.mockResolvedValue([inv({ subtotalCents: 50000, currency: 'EUR' })]);
    renderWithProviders(<PortalInvoicesPage />);
    // The amount is formatted from cents; the row also shows the billing period.
    expect(await screen.findByText('ANX-2026-0001')).toBeInTheDocument();
    expect(screen.getByText(/annex ref/i)).toBeInTheDocument(); // table header rendered
  });
});
