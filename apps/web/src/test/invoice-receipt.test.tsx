// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { InvoiceView } from '@gira/shared';
import { InvoiceReceipt } from '../ui/InvoiceReceipt';

function makeInvoice(overrides: Partial<InvoiceView> = {}): InvoiceView {
  return {
    id: 'inv1',
    number: 'ANX-2026-0001',
    clientName: 'Acme Corp',
    currency: 'EUR',
    status: 'issued',
    subtotalCents: 18000,
    periodStart: '2026-05-01T00:00:00Z',
    periodEnd: '2026-05-31T00:00:00Z',
    issuedAt: '2026-06-01T00:00:00Z',
    paidAt: null,
    createdAt: '2026-05-31T00:00:00Z',
    externalInvoiceRef: null,
    notes: null,
    lines: [
      {
        id: 'l1',
        issueKey: 'GIRA-1',
        description: 'Build the sled',
        minutes: 120,
        hourlyCents: 6000,
        amountCents: 12000,
      },
      {
        id: 'l2',
        issueKey: 'GIRA-2',
        description: 'Fixed task',
        minutes: 0,
        hourlyCents: null,
        amountCents: 6000,
      },
    ],
    ...overrides,
  } as unknown as InvoiceView;
}

describe('InvoiceReceipt', () => {
  it('renders the annex number, client, lines, and issued status', () => {
    render(<InvoiceReceipt invoice={makeInvoice()} />);
    expect(screen.getByText('ANX-2026-0001')).toBeInTheDocument();
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
    expect(screen.getByText('Build the sled')).toBeInTheDocument();
    expect(screen.getByText(/Issued|Emitida/)).toBeInTheDocument();
  });

  it('renders the void and paid status variants', () => {
    const { rerender } = render(<InvoiceReceipt invoice={makeInvoice({ status: 'void' })} />);
    expect(screen.getByText(/Void|Anulada/)).toBeInTheDocument();
    rerender(
      <InvoiceReceipt invoice={makeInvoice({ status: 'paid', paidAt: '2026-06-05T00:00:00Z' })} />,
    );
    expect(screen.getByText(/Paid|Pagada/)).toBeInTheDocument();
  });

  it('renders a draft with notes and an external fiscal reference', () => {
    render(
      <InvoiceReceipt
        invoice={makeInvoice({
          status: 'draft',
          notes: 'gracias!',
          externalInvoiceRef: 'TBAI-123',
        })}
      />,
    );
    expect(screen.getByText(/Draft|Borrador/)).toBeInTheDocument();
    expect(screen.getByText(/gracias!/)).toBeInTheDocument();
    expect(screen.getByText(/TBAI-123/)).toBeInTheDocument();
  });
});
