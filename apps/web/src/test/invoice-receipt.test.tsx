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
        kind: 'billable',
      },
      {
        id: 'l2',
        issueKey: 'GIRA-2',
        description: 'Fixed task',
        minutes: 0,
        hourlyCents: null,
        amountCents: 6000,
        kind: 'fixed',
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

  it('labels each line with its billing-type badge so a mixed annex stays legible', () => {
    render(
      <InvoiceReceipt
        invoice={makeInvoice({
          subtotalCents: 518000,
          lines: [
            {
              id: 'l1',
              issueKey: 'GIRA-1',
              description: 'Billable hours',
              minutes: 120,
              hourlyCents: 6000,
              amountCents: 12000,
              kind: 'billable',
            },
            {
              id: 'l2',
              issueKey: 'GIRA-2',
              description: 'Fixed task',
              minutes: 0,
              hourlyCents: null,
              amountCents: 6000,
              kind: 'fixed',
            },
            {
              id: 'l3',
              issueKey: 'GIRA-3',
              description: 'Covered by the retainer',
              minutes: 300,
              hourlyCents: null,
              amountCents: 0,
              kind: 'covered',
            },
            {
              id: 'l4',
              issueKey: 'RETAINER',
              description: 'Cuota fija · retainer',
              minutes: 0,
              hourlyCents: null,
              amountCents: 500000,
              kind: 'retainer',
            },
          ],
        })}
      />,
    );
    // One badge per line, each visually distinguishing the billing nature.
    expect(screen.getByTestId('line-kind-billable')).toHaveTextContent(/Facturable.*billable/);
    expect(screen.getByTestId('line-kind-fixed')).toHaveTextContent(/Precio fijo/);
    expect(screen.getByTestId('line-kind-covered')).toHaveTextContent(/Cubierto/);
    expect(screen.getByTestId('line-kind-retainer')).toHaveTextContent(/Cuota/);
    // The covered line (5h) shows its rate cell as "included", not "fixed".
    expect(screen.getByText(/incluido.*included/i)).toBeInTheDocument();
    // Footer totals the covered time and states it's included in the flat fee.
    const footer = screen.getByTestId('covered-footer');
    expect(footer).toHaveTextContent(/Tiempo cubierto.*Covered time.*5h/);
    expect(footer).toHaveTextContent(/incluido en la cuota fija.*flat monthly fee/i);
  });

  it('omits the covered footer when no line is covered', () => {
    render(<InvoiceReceipt invoice={makeInvoice()} />); // billable + fixed only
    expect(screen.queryByTestId('covered-footer')).not.toBeInTheDocument();
  });

  it('footer reads "not billed" for covered work without a retainer', () => {
    render(
      <InvoiceReceipt
        invoice={makeInvoice({
          subtotalCents: 0,
          lines: [
            {
              id: 'l1',
              issueKey: 'GIRA-1',
              description: 'Goodwill fix',
              minutes: 120,
              hourlyCents: null,
              amountCents: 0,
              kind: 'covered',
            },
          ],
        })}
      />,
    );
    const footer = screen.getByTestId('covered-footer');
    expect(footer).toHaveTextContent(/Covered time.*2h/);
    expect(footer).toHaveTextContent(/no facturado.*not billed/i);
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
