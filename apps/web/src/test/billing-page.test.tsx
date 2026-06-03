// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

// vi.hoisted so the hoisted vi.mock factories can close over the spies.
const { clientsList, listForClient, generate, toastSpy, navigateSpy, role } = vi.hoisted(() => ({
  clientsList: vi.fn(),
  listForClient: vi.fn(),
  generate: vi.fn(),
  toastSpy: vi.fn(),
  navigateSpy: vi.fn(),
  // STABLE mutable ref so useMe returns the same object across renders.
  role: { value: 'admin' as string },
}));

vi.mock('../api/client', () => ({
  clients: { list: () => clientsList() },
  invoices: {
    listForClient: (id: string) => listForClient(id),
    generate: (c: string, b: unknown) => generate(c, b),
  },
  // A real-ish ApiError (mirrors the real (status, body, message) constructor) so
  // `err instanceof ApiError` resolves the body branch and err.message is the message.
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

import { ApiError } from '../api/client';
import { BillingPage } from '../pages/BillingPage';

const TWO_CLIENTS = [
  { id: 'c1', name: 'Acme Corp', slug: 'acme', currency: 'EUR' },
  { id: 'c2', name: 'Beta Inc', slug: 'beta', currency: 'USD' },
];

// Pick the Acme option so the GenerateForm + InvoiceList mount.
async function selectAcme() {
  const select = await screen.findByRole('combobox');
  await userEvent.selectOptions(select, 'c1');
  return select;
}

describe('BillingPage', () => {
  beforeEach(() => {
    role.value = 'admin';
    clientsList.mockReset().mockResolvedValue([]);
    listForClient.mockReset().mockResolvedValue([]);
    generate.mockReset();
    toastSpy.mockReset();
    navigateSpy.mockReset();
  });

  // ── Page header + client selector ─────────────────────────────────────────

  it('renders the header and the client selector with the loaded clients', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    renderWithProviders(<BillingPage />);

    expect(screen.getByText('FACTURACIÓN')).toBeInTheDocument();
    expect(screen.getByText(/BILLING ANNEXES/)).toBeInTheDocument();
    // Clients render as <option>{name} ({currency})</option>.
    expect(await screen.findByRole('option', { name: /Acme Corp \(EUR\)/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Beta Inc \(USD\)/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /select client/i })).toBeInTheDocument();
  });

  it('shows the clients loading state before the list resolves', () => {
    // Never-resolving promise → query stays in isLoading.
    clientsList.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<BillingPage />);
    expect(screen.getByText(/loading clients/i)).toBeInTheDocument();
  });

  it('shows the clients error state when the list query rejects', async () => {
    clientsList.mockRejectedValue(new ApiError(400, null, 'boom'));
    renderWithProviders(<BillingPage />);
    expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
  });

  it('does not render the generate form or annex list until a client is picked', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    renderWithProviders(<BillingPage />);
    await screen.findByRole('option', { name: /Acme Corp/ });
    expect(screen.queryByText(/GENERATE ANNEX/)).not.toBeInTheDocument();
    expect(listForClient).not.toHaveBeenCalled();
  });

  // ── InvoiceList states ─────────────────────────────────────────────────────

  it('shows the empty annex state for the selected client', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([]);
    renderWithProviders(<BillingPage />);
    await selectAcme();

    expect(await screen.findByText(/no annexes yet/i)).toBeInTheDocument();
    // Header count is 0.
    expect(screen.getByText(/BILLING ANNEXES · 0/)).toBeInTheDocument();
    expect(listForClient).toHaveBeenCalledWith('c1');
  });

  it('shows the annex list loading state', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<BillingPage />);
    await selectAcme();
    expect(await screen.findByText(/loading annexes/i)).toBeInTheDocument();
  });

  it('shows the annex list error state when listForClient rejects', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockRejectedValue(new ApiError(400, null, 'nope'));
    renderWithProviders(<BillingPage />);
    await selectAcme();
    expect(await screen.findByText(/failed to load annexes/i)).toBeInTheDocument();
  });

  it('renders annex rows with all status badges, money, period, and ticketbai ref', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([
      {
        id: 'inv-draft',
        number: 'ANX-2026-0001',
        externalInvoiceRef: null,
        clientId: 'c1',
        clientName: 'Acme Corp',
        status: 'draft',
        currency: 'EUR',
        subtotalCents: 18000,
        periodStart: null,
        periodEnd: null,
        createdAt: '2026-06-01T00:00:00Z',
        issuedAt: null,
        paidAt: null,
      },
      {
        id: 'inv-issued',
        number: 'ANX-2026-0002',
        externalInvoiceRef: 'TBAI-9',
        clientId: 'c1',
        clientName: 'Acme Corp',
        status: 'issued',
        currency: 'EUR',
        subtotalCents: 250050,
        periodStart: '2026-05-01T00:00:00Z',
        periodEnd: '2026-05-31T00:00:00Z',
        createdAt: '2026-05-31T00:00:00Z',
        issuedAt: '2026-05-31T00:00:00Z',
        paidAt: null,
      },
      {
        id: 'inv-paid',
        number: 'ANX-2026-0003',
        externalInvoiceRef: null,
        clientId: 'c1',
        clientName: 'Acme Corp',
        status: 'paid',
        currency: 'EUR',
        subtotalCents: 9900,
        periodStart: '2026-04-01T00:00:00Z',
        periodEnd: null,
        createdAt: '2026-04-30T00:00:00Z',
        issuedAt: '2026-04-30T00:00:00Z',
        paidAt: '2026-05-02T00:00:00Z',
      },
      {
        id: 'inv-void',
        number: 'ANX-2026-0004',
        externalInvoiceRef: null,
        clientId: 'c1',
        clientName: 'Acme Corp',
        status: 'void',
        currency: 'EUR',
        subtotalCents: 0,
        periodStart: null,
        periodEnd: null,
        createdAt: '2026-03-01T00:00:00Z',
        issuedAt: null,
        paidAt: null,
      },
    ]);
    renderWithProviders(<BillingPage />);
    await selectAcme();

    // Each row's number is rendered, and the row links to the invoice detail.
    const draftLink = await screen.findByRole('link', { name: /ANX-2026-0001/ });
    expect(draftLink).toHaveAttribute('href', '/invoices/inv-draft');
    expect(screen.getByRole('link', { name: /ANX-2026-0002/ })).toHaveAttribute(
      'href',
      '/invoices/inv-issued',
    );

    // All four status badges (ES · EN).
    expect(screen.getByText('Borrador · Draft')).toBeInTheDocument();
    expect(screen.getByText('Emitida · Issued')).toBeInTheDocument();
    expect(screen.getByText('Pagada · Paid')).toBeInTheDocument();
    expect(screen.getByText('Anulada · Void')).toBeInTheDocument();

    // Money is es-ES formatted with the currency prefix (thousands separator is
    // ICU-build dependent under jsdom, so match the comma-decimal loosely).
    expect(screen.getByText('EUR 180,00')).toBeInTheDocument();
    expect(screen.getByText(/EUR 2.?500,50/)).toBeInTheDocument();

    // TicketBAI external ref shown when present, em-dash otherwise.
    expect(screen.getByText('TBAI-9')).toBeInTheDocument();

    // Header count reflects 4 rows.
    expect(screen.getByText(/BILLING ANNEXES · 4/)).toBeInTheDocument();

    // The two rows with no period (draft + void) show the "all work" fallback.
    expect(screen.getAllByText(/all work/i)).toHaveLength(2);
  });

  // ── GenerateForm flows ──────────────────────────────────────────────────────

  it('hides the generate form for viewers and shows the read-only banner', async () => {
    role.value = 'viewer';
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([]);
    renderWithProviders(<BillingPage />);
    await selectAcme();

    expect(await screen.findByText(/read-only/i)).toBeInTheDocument();
    expect(screen.queryByText(/GENERATE ANNEX/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Generate Annex/ })).not.toBeInTheDocument();
  });

  it('shows the selected client currency in the generate form head', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([]);
    renderWithProviders(<BillingPage />);
    const select = await screen.findByRole('combobox');
    await userEvent.selectOptions(select, 'c2'); // Beta Inc · USD

    const head = (await screen.findByText(/GENERATE ANNEX/)).closest('div')!;
    expect(within(head).getByText('USD')).toBeInTheDocument();
  });

  it('generates an annex with the typed period + notes, toasts ok, and navigates', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([]);
    generate.mockResolvedValue({ id: 'new-inv', number: 'ANX-2026-0099' });
    renderWithProviders(<BillingPage />);
    await selectAcme();

    const startInput = (await screen.findByText(/period start/i))
      .closest('div')!
      .querySelector('input')!;
    const endInput = screen
      .getByText(/period end/i)
      .closest('div')!
      .querySelector('input')!;
    const notes = screen.getByRole('textbox'); // the only textarea

    await userEvent.type(startInput, '2026-05-01');
    await userEvent.type(endInput, '2026-05-31');
    await userEvent.type(notes, 'May retainer');

    await userEvent.click(screen.getByRole('button', { name: /Generate Annex/ }));

    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    expect(generate).toHaveBeenCalledWith('c1', {
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      notes: 'May retainer',
    });
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', body: 'ANX-2026-0099' }),
      ),
    );
    expect(navigateSpy).toHaveBeenCalledWith('/invoices/new-inv');
  });

  it('omits empty optional fields (sends undefined) when generating with no input', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([]);
    generate.mockResolvedValue({ id: 'i2', number: 'ANX-2026-0100' });
    renderWithProviders(<BillingPage />);
    await selectAcme();

    await userEvent.click(await screen.findByRole('button', { name: /Generate Annex/ }));

    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    expect(generate).toHaveBeenCalledWith('c1', {
      periodStart: undefined,
      periodEnd: undefined,
      notes: undefined,
    });
    expect(navigateSpy).toHaveBeenCalledWith('/invoices/i2');
  });

  it('surfaces a danger toast and the inline error span when generate fails', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([]);
    generate.mockRejectedValue(new ApiError(400, null, 'period overlaps an existing annex'));
    renderWithProviders(<BillingPage />);
    await selectAcme();

    await userEvent.click(await screen.findByRole('button', { name: /Generate Annex/ }));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al generar · Generate failed',
          body: 'period overlaps an existing annex',
        }),
      ),
    );
    // The inline "// error · check input" hint appears once the mutation is in error.
    expect(await screen.findByText(/error · check input/i)).toBeInTheDocument();
    // No navigation on failure.
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('falls back to "Error" body when the rejection is not an ApiError', async () => {
    clientsList.mockResolvedValue(TWO_CLIENTS);
    listForClient.mockResolvedValue([]);
    generate.mockRejectedValue(new TypeError('network'));
    renderWithProviders(<BillingPage />);
    await selectAcme();

    await userEvent.click(await screen.findByRole('button', { name: /Generate Annex/ }));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'danger', body: 'Error' }),
      ),
    );
  });
});
