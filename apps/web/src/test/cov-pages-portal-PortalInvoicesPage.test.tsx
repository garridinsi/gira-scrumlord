// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for PortalInvoicesPage: the isError state (both the
// Error-message and the non-Error fallback branches), the row hover handlers
// (onMouseEnter/onMouseLeave for both even/odd backgrounds), and the period
// column branches (both bounds present, one bound missing → "—", and no
// period at all → "all work").
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { InvoiceListItemView } from '@gira/shared';
import { renderWithProviders } from './render';

const { invoices, navigateSpy } = vi.hoisted(() => ({
  invoices: vi.fn(),
  navigateSpy: vi.fn(),
}));

vi.mock('../api/client', () => ({ portal: { invoices: () => invoices() } }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateSpy };
});

import { PortalInvoicesPage } from '../pages/portal/PortalInvoicesPage';

const inv = (over: Partial<InvoiceListItemView>): InvoiceListItemView =>
  ({
    id: 'i1',
    number: 'ANX-2026-0001',
    externalInvoiceRef: null,
    clientId: 'c1',
    clientName: 'Acme',
    status: 'issued',
    subtotalCents: 18000,
    currency: 'EUR',
    periodStart: '2026-05-01T00:00:00Z',
    periodEnd: '2026-05-31T00:00:00Z',
    createdAt: '2026-06-01T00:00:00Z',
    issuedAt: null,
    paidAt: null,
    ...over,
  }) as InvoiceListItemView;

describe('PortalInvoicesPage (coverage)', () => {
  beforeEach(() => {
    invoices.mockReset();
    navigateSpy.mockReset();
  });

  it('renders the error state with the Error message when the query rejects', async () => {
    invoices.mockRejectedValue(new Error('annex backend exploded'));
    renderWithProviders(<PortalInvoicesPage />);

    // The error banner + the Error.message branch (error instanceof Error).
    expect(await screen.findByText('Error · Error')).toBeInTheDocument();
    expect(screen.getByText('annex backend exploded')).toBeInTheDocument();
  });

  it('renders the error fallback copy when the rejection is not an Error', async () => {
    // A non-Error rejection drives the `: fallback` arm of the ternary.
    invoices.mockRejectedValue('plain string failure');
    renderWithProviders(<PortalInvoicesPage />);

    expect(await screen.findByText('Error · Error')).toBeInTheDocument();
    expect(
      screen.getByText('No se pudieron cargar los anexos · Could not load annexes'),
    ).toBeInTheDocument();
  });

  it('toggles the row background on hover enter/leave for both even and odd rows', async () => {
    invoices.mockResolvedValue([
      inv({ id: 'i1', number: 'ANX-2026-0001' }),
      inv({ id: 'i2', number: 'ANX-2026-0002' }),
    ]);
    renderWithProviders(<PortalInvoicesPage />);

    const firstNumber = await screen.findByText('ANX-2026-0001');
    const secondNumber = screen.getByText('ANX-2026-0002');
    const firstRow = firstNumber.closest('button')!;
    const secondRow = secondNumber.closest('button')!;

    // Row 0 (i=0, even): base eg-paper-2, hover → eg-paper-3, leave → eg-paper-2.
    fireEvent.mouseEnter(firstRow);
    expect(firstRow.style.background).toBe('var(--eg-paper-3)');
    fireEvent.mouseLeave(firstRow);
    expect(firstRow.style.background).toBe('var(--eg-paper-2)');

    // Row 1 (i=1, odd): leave restores eg-paper (the other ternary arm).
    fireEvent.mouseEnter(secondRow);
    expect(secondRow.style.background).toBe('var(--eg-paper-3)');
    fireEvent.mouseLeave(secondRow);
    expect(secondRow.style.background).toBe('var(--eg-paper)');
  });

  it('navigates to the annex detail when a row is clicked', async () => {
    invoices.mockResolvedValue([inv({ id: 'i9', number: 'ANX-2026-0009' })]);
    renderWithProviders(<PortalInvoicesPage />);

    const row = (await screen.findByText('ANX-2026-0009')).closest('button')!;
    await userEvent.click(row);
    expect(navigateSpy).toHaveBeenCalledWith('/portal/invoices/i9');
  });

  it('renders both period bounds when start and end are present', async () => {
    invoices.mockResolvedValue([
      inv({ periodStart: '2026-05-01T00:00:00Z', periodEnd: '2026-05-31T00:00:00Z' }),
    ]);
    renderWithProviders(<PortalInvoicesPage />);

    await screen.findByText('ANX-2026-0001');
    // formatDate uses en-US short style; both bounds render in one cell:
    // "May 1, 2026 – May 31, 2026". Match the whole cell's text content.
    expect(
      screen.getByText((_t, el) => el?.textContent === 'May 1, 2026 – May 31, 2026'),
    ).toBeInTheDocument();
  });

  it('renders a dash for the missing bound when only one of start/end is set', async () => {
    invoices.mockResolvedValue([inv({ periodStart: '2026-05-01T00:00:00Z', periodEnd: null })]);
    renderWithProviders(<PortalInvoicesPage />);

    await screen.findByText('ANX-2026-0001');
    // Start present → formatDate; end null → "—" fallback. The cell renders
    // "May 1, 2026 – —" across fragments; match the whole cell's text content.
    expect(screen.getByText((_t, el) => el?.textContent === 'May 1, 2026 – —')).toBeInTheDocument();
  });

  it('renders a dash for a missing start bound when only the end is set', async () => {
    invoices.mockResolvedValue([inv({ periodStart: null, periodEnd: '2026-05-31T00:00:00Z' })]);
    renderWithProviders(<PortalInvoicesPage />);

    await screen.findByText('ANX-2026-0001');
    // Start null → "—" fallback; end present → formatDate. Cell: "— – May 31, 2026".
    expect(
      screen.getByText((_t, el) => el?.textContent === '— – May 31, 2026'),
    ).toBeInTheDocument();
  });

  it('renders the "all work" copy when neither period bound is set', async () => {
    invoices.mockResolvedValue([inv({ periodStart: null, periodEnd: null })]);
    renderWithProviders(<PortalInvoicesPage />);

    await screen.findByText('ANX-2026-0001');
    expect(screen.getByText('todo el trabajo · all work')).toBeInTheDocument();
  });
});
