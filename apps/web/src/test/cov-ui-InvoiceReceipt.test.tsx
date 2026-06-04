// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage closure for src/ui/InvoiceReceipt.tsx — exercises the partial-period
// em-dash fallbacks (one of periodStart/periodEnd null) and the empty-lines state.
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
    ],
    ...overrides,
  } as unknown as InvoiceView;
}

describe('InvoiceReceipt — coverage closure', () => {
  function periodText(): string {
    const label = screen.getByText('// período · period');
    const value = label.nextElementSibling as HTMLElement | null;
    expect(value).not.toBeNull();
    return value!.textContent ?? '';
  }

  it('renders an em-dash for a missing period END (start present, end null)', () => {
    // hasPeriod is truthy via periodStart, so the period fragment renders; the
    // periodEnd ternary falls through to its '—' branch (line 262). Exactly one
    // em-dash fallback is shown, on the trailing (end) side. Date string is left
    // unasserted because no TZ is pinned in the test env.
    render(
      <InvoiceReceipt
        invoice={makeInvoice({ periodStart: '2026-05-01T00:00:00Z', periodEnd: null })}
      />,
    );
    const text = periodText();
    expect(text).toContain('–'); // en-dash separator between the two sides
    expect((text.match(/—/g) ?? []).length).toBe(1); // single em-dash fallback (end missing)
    // The present (start) side formatted to a real date, not another fallback.
    expect(text).toMatch(/\d{4}/);
  });

  it('renders an em-dash for a missing period START (start null, end present)', () => {
    // hasPeriod is truthy via periodEnd; the periodStart ternary takes its '—'
    // branch (line 260) and the periodEnd branch formats the date.
    render(
      <InvoiceReceipt
        invoice={makeInvoice({ periodStart: null, periodEnd: '2026-05-31T00:00:00Z' })}
      />,
    );
    const text = periodText();
    expect(text).toContain('–'); // en-dash separator
    expect((text.match(/—/g) ?? []).length).toBe(1); // single em-dash fallback (start missing)
    expect(text).toMatch(/\d{4}/); // the present (end) side formatted to a real date
  });

  it('renders the empty-lines placeholder when the invoice has no lines', () => {
    // lines.length === 0 → the "sin líneas · no lines" block (lines 468–481).
    render(<InvoiceReceipt invoice={makeInvoice({ lines: [] })} />);
    expect(screen.getByText(/sin líneas · no lines/)).toBeInTheDocument();
    // The header is still rendered, but no data rows / issue chips exist.
    expect(screen.queryByText('GIRA-1')).not.toBeInTheDocument();
  });
});
