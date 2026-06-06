// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage closer for src/pages/BillingPage.tsx. The sibling billing-page.test.tsx
// (owned by another agent) covers the main flows; this file surgically hits the
// branches it leaves uncovered:
//   - 173: the generate button's `isPending ? '...'` pending label
//   - 207: the `listQ.data ?? []` nullish fallback (listForClient resolves null)
//   - 273-279: the row onMouseEnter/onMouseLeave background handlers (both ternary arms)
//   - 306: the `inv.periodStart ? … : '—'` em-dash arm (start null, end set)
//   - 454: the `clientsQ.data ?? []` nullish fallback in the option map
//   - 470: the `selectedClient?.currency ?? 'EUR'` fallback (client without currency)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { InvoiceListItemView } from '@gira/shared';
import { renderWithProviders } from './render';

// vi.hoisted so the hoisted vi.mock factories can close over the spies.
const { clientsList, listForClient, preview, generate, toastSpy, navigateSpy, role } = vi.hoisted(
  () => ({
    clientsList: vi.fn(),
    listForClient: vi.fn(),
    preview: vi.fn(),
    generate: vi.fn(),
    toastSpy: vi.fn(),
    navigateSpy: vi.fn(),
    // STABLE mutable ref so useMe returns the same object across renders.
    role: { value: 'admin' as string },
  }),
);

vi.mock('../api/client', () => ({
  clients: { list: () => clientsList() },
  invoices: {
    listForClient: (id: string) => listForClient(id),
    preview: (c: string, b: unknown) => preview(c, b),
    generate: (c: string, b: unknown) => generate(c, b),
  },
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown, message: string) {
      super(message);
      this.status = status;
      this.body = body;
    }
  },
}));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: { role: role.value } }) }));
vi.mock('../ui/Toast', () => ({ useToast: () => toastSpy }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateSpy };
});

import { BillingPage } from '../pages/BillingPage';

const TWO_CLIENTS = [
  { id: 'c1', name: 'Acme Corp', slug: 'acme', currency: 'EUR' },
  { id: 'c2', name: 'Beta Inc', slug: 'beta', currency: 'USD' },
];

// A client whose `currency` is absent — drives the `?? 'EUR'` fallback at 470.
const NO_CURRENCY_CLIENT = { id: 'c3', name: 'Gamma LLC', slug: 'gamma' };

function inv(over: Partial<InvoiceListItemView> & { id: string }): InvoiceListItemView {
  return {
    number: 'ANX-2026-0001',
    externalInvoiceRef: null,
    clientId: 'c1',
    clientName: 'Acme Corp',
    status: 'draft',
    currency: 'EUR',
    subtotalCents: 1000,
    periodStart: null,
    periodEnd: null,
    createdAt: '2026-06-01T00:00:00Z',
    issuedAt: null,
    paidAt: null,
    ...over,
  };
}

// Pick the Acme option so the GenerateForm + InvoiceList mount.
async function selectAcme() {
  const select = await screen.findByRole('combobox');
  await userEvent.selectOptions(select, 'c1');
  return select;
}

describe('BillingPage (coverage)', () => {
  beforeEach(() => {
    role.value = 'admin';
    clientsList.mockReset().mockResolvedValue([]);
    listForClient.mockReset().mockResolvedValue([]);
    preview.mockReset();
    generate.mockReset();
    toastSpy.mockReset();
    navigateSpy.mockReset();
  });

  // A complete ephemeral preview view, enough for <InvoiceReceipt> to render.
  const previewView = () => ({
    id: '',
    number: null,
    externalInvoiceRef: null,
    clientId: 'c1',
    clientName: 'Acme Corp',
    status: 'draft',
    currency: 'EUR',
    subtotalCents: 12000,
    periodStart: null,
    periodEnd: null,
    createdAt: '2026-06-01T00:00:00Z',
    issuedAt: null,
    paidAt: null,
    notes: null,
    lines: [
      {
        id: 'preview-0',
        issueKey: 'ACME-1',
        description: 'Work',
        minutes: 120,
        hourlyCents: 6000,
        amountCents: 12000,
        kind: 'billable',
      },
    ],
  });

  // ── pending label on the preview button ────────────────────────────────────
  it('shows the "..." pending label while the preview mutation is in flight', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([]);
    // Never resolves → mutation stays isPending, exposing the "..." label.
    preview.mockReturnValue(new Promise<never>(() => {}));
    renderWithProviders(<BillingPage />);
    await selectAcme();

    const btn = await screen.findByRole('button', { name: /Preview/ });
    await userEvent.click(btn);

    expect(await screen.findByRole('button', { name: '...' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Preview/ })).not.toBeInTheDocument();
  });

  // ── null-number draft row shows the "— borrador · draft" placeholder ───────
  it('renders the draft placeholder for an unnumbered annex in the list', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([inv({ id: 'd0', number: null, status: 'draft' })]);
    renderWithProviders(<BillingPage />);
    await selectAcme();

    expect(await screen.findByText(/— borrador · draft/i)).toBeInTheDocument();
  });

  // ── 207: listQ.data ?? [] when listForClient resolves null ─────────────────
  it('treats a null annex list as empty (nullish fallback)', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    // Resolve null so `listQ.data ?? []` takes the [] arm.
    listForClient.mockResolvedValue(null);
    renderWithProviders(<BillingPage />);
    await selectAcme();

    expect(await screen.findByText(/no annexes yet/i)).toBeInTheDocument();
    expect(screen.getByText(/BILLING ANNEXES · 0/)).toBeInTheDocument();
  });

  // ── 273-279: row hover enter/leave, both even and odd rows ──────────────────
  it('toggles the row background on hover enter/leave for both even and odd rows', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([
      inv({ id: 'r0', number: 'ANX-2026-1000' }),
      inv({ id: 'r1', number: 'ANX-2026-1001' }),
    ]);
    renderWithProviders(<BillingPage />);
    await selectAcme();

    const firstRow = (await screen.findByText('ANX-2026-1000')).closest('a')!;
    const secondRow = screen.getByText('ANX-2026-1001').closest('a')!;

    // Row 0 (i=0, even): mouseEnter runs the hover handler; mouseLeave restores the
    // even-arm background (eg-paper-2). We assert the leave result — the nested
    // var() the enter handler writes is not reliably round-tripped by jsdom CSSOM,
    // but firing the event still executes the handler for coverage.
    fireEvent.mouseEnter(firstRow);
    fireEvent.mouseLeave(firstRow);
    expect(firstRow.style.background).toBe('var(--eg-paper-2)');

    // Row 1 (i=1, odd): leave restores eg-paper (the other ternary arm at 278).
    fireEvent.mouseEnter(secondRow);
    fireEvent.mouseLeave(secondRow);
    expect(secondRow.style.background).toBe('var(--eg-paper)');
  });

  // ── 306: the em-dash arm when periodStart is null but periodEnd is set ──────
  it('renders an em-dash for a missing period start when only the end is set', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([
      inv({
        id: 'end-only',
        number: 'ANX-2026-2000',
        periodStart: null,
        // Noon UTC avoids a timezone date-boundary shift in jsdom (TZ is unpinned).
        periodEnd: '2026-05-31T12:00:00Z',
      }),
    ]);
    renderWithProviders(<BillingPage />);
    await selectAcme();

    const row = (await screen.findByText('ANX-2026-2000')).closest('a')!;
    // Start arm renders '—', end arm renders the formatted date → "— – <Mon> 31, 2026".
    // Assert the structure (em-dash, en-dash, a short-month date) not the exact day.
    expect(within(row).getByText(/—\s*–\s*[A-Z][a-z]{2} \d{1,2}, 2026/)).toBeInTheDocument();
  });

  // ── 454: clientsQ.data ?? [] nullish fallback in the option map ─────────────
  it('renders only the placeholder option when the clients list resolves null', async () => {
    // clients.list() resolves null → `(clientsQ.data ?? []).map` takes the [] arm.
    clientsList.mockResolvedValue(null);
    renderWithProviders(<BillingPage />);

    const select = await screen.findByRole('combobox');
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]!).toHaveTextContent(/select client/i);
  });

  // ── 470: selectedClient?.currency ?? 'EUR' fallback ─────────────────────────
  it('falls back to EUR in the generate form head when the client has no currency', async () => {
    // c3 has no `currency` field → selectedClient.currency is undefined → 'EUR'.
    clientsList.mockResolvedValue([...TWO_CLIENTS, NO_CURRENCY_CLIENT]);
    listForClient.mockResolvedValue([]);
    renderWithProviders(<BillingPage />);

    const select = await screen.findByRole('combobox');
    await userEvent.selectOptions(select, 'c3');

    const head = (await screen.findByText(/GENERATE ANNEX/)).closest('div')!;
    expect(within(head).getByText('EUR')).toBeInTheDocument();
  });

  // ── preview → save draft → navigate to the saved (unnumbered) annex ─────────
  it('navigates to the saved draft after previewing then saving', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([]);
    preview.mockResolvedValue(previewView());
    generate.mockResolvedValue({ id: 'gen-1', number: null });
    renderWithProviders(<BillingPage />);
    await selectAcme();

    await userEvent.click(await screen.findByRole('button', { name: /Preview/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Save draft/ }));

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/invoices/gen-1'));
  });

  // ── Discard clears the preview without saving ───────────────────────────────
  it('discards the preview without saving', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([]);
    preview.mockResolvedValue(previewView());
    renderWithProviders(<BillingPage />);
    await selectAcme();

    await userEvent.click(await screen.findByRole('button', { name: /Preview/ }));
    expect(await screen.findByText(/BORRADOR · DRAFT/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Discard/ }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Save draft/ })).not.toBeInTheDocument(),
    );
    expect(generate).not.toHaveBeenCalled();
  });
});
