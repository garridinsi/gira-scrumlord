// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-focused suite for InvoiceDetailPage. Targets the branches the main
// invoice-detail-page suite leaves uncovered:
//   - CSV export of a fixed-price line (hourlyCents null → '' rate cell)   [src:33]
//   - the non-ApiError ': Error' fallback bodies on every mutation onError  [src:67,161,176,191,207]
//   - the generic load-error fallback when the rejection is not an Error    [src:277,278]
//   - the per-button pending '...' labels (issue/pay/void/delete + Save ref) [src:121,351,366,379,393]
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import type { InvoiceView } from '@gira/shared';
import { renderWithProviders } from './render';

// vi.hoisted so the (hoisted) mock factories can close over the spies.
const h = vi.hoisted(() => ({
  get: vi.fn(),
  issue: vi.fn(),
  pay: vi.fn(),
  void: vi.fn(),
  del: vi.fn(),
  setExternalRef: vi.fn(),
  toast: vi.fn(),
  downloadCsv: vi.fn(),
}));

// Stable mutable ref so useMe returns the same object reference across renders.
const meData = vi.hoisted(() => ({ current: { role: 'admin' } as { role: string } }));

vi.mock('../api/client', () => ({
  invoices: {
    get: (id: string) => h.get(id),
    issue: (id: string) => h.issue(id),
    pay: (id: string) => h.pay(id),
    void: (id: string) => h.void(id),
    delete: (id: string) => h.del(id),
    setExternalRef: (id: string, ref: string | null) => h.setExternalRef(id, ref),
  },
  // Real-ish ApiError so `err instanceof ApiError` and `.status === 404` resolve.
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

vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: meData.current }) }));
vi.mock('../ui/Toast', () => ({ useToast: () => h.toast }));
// Spy the CSV download so the export path runs without jsdom Blob-URL plumbing and
// we can assert the exact rows exportAnnexCsv builds (incl. the null-rate cell).
vi.mock('../lib/csv', async () => {
  const actual = await vi.importActual<typeof import('../lib/csv')>('../lib/csv');
  return { ...actual, downloadCsv: (name: string, rows: unknown) => h.downloadCsv(name, rows) };
});

import { InvoiceDetailPage } from '../pages/InvoiceDetailPage';

const baseInvoice = (over: Partial<InvoiceView> = {}): InvoiceView =>
  ({
    id: 'inv1',
    number: 'ANX-2026-0001',
    status: 'draft',
    clientId: 'c1',
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
    lines: [
      {
        id: 'l1',
        issueKey: 'GIRA-1',
        description: 'work line one',
        minutes: 60,
        hourlyCents: 6000,
        amountCents: 6000,
        kind: 'billable',
      },
    ],
    ...over,
  }) as InvoiceView;

const renderAt = (id = 'inv1') =>
  renderWithProviders(
    <Routes>
      <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
      <Route path="/billing" element={<div>Billing landing</div>} />
    </Routes>,
    { route: `/invoices/${id}` },
  );

// A promise that never settles — drives a mutation into the isPending '...' state.
const never = () => new Promise<never>(() => {});

describe('InvoiceDetailPage (coverage)', () => {
  beforeEach(() => {
    h.get.mockReset();
    h.issue.mockReset();
    h.pay.mockReset();
    h.void.mockReset();
    h.del.mockReset();
    h.setExternalRef.mockReset();
    h.toast.mockReset();
    h.downloadCsv.mockReset();
    meData.current = { role: 'admin' };
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── CSV: fixed-price line → null hourly rate → '' rate cell [src:33] ──────────
  it('exports a CSV with an empty rate cell for a fixed-price (null hourly) line', async () => {
    h.get.mockResolvedValue(
      baseInvoice({
        externalInvoiceRef: 'TBS-2026-0009',
        lines: [
          {
            id: 'lfix',
            issueKey: 'GIRA-9',
            description: 'fixed price line',
            minutes: 120,
            hourlyCents: null, // fixed-price → exportAnnexCsv emits '' for the rate cell
            amountCents: 5000,
            kind: 'fixed',
          },
        ],
      }),
    );
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: 'CSV' }));

    expect(h.downloadCsv).toHaveBeenCalledTimes(1);
    const rows = h.downloadCsv.mock.calls[0]![1] as unknown[][];
    // Filename arg is the annex number.
    expect(h.downloadCsv.mock.calls[0]![0]).toBe('ANX-2026-0001');
    // The single data line: issueKey, description, minutes, hours, '' rate, amount.
    expect(rows).toContainEqual(['GIRA-9', 'fixed price line', 120, '2.00', '', '50.00']);
  });

  // ── Generic load-error fallback when the rejection is not an Error [src:277,278] ─
  it('shows the generic could-not-load fallback when the query rejects a non-Error value', async () => {
    // A non-Error, non-ApiError rejection: is404 false, `error instanceof Error` false →
    // the final '·' fallback string renders.
    h.get.mockRejectedValue('plain string rejection');
    renderAt('inv1');
    expect(
      await screen.findByText('No se pudo cargar el anexo · Could not load annex'),
    ).toBeInTheDocument();
    expect(screen.getByText('Error · Error')).toBeInTheDocument();
  });

  it('surfaces the Error.message in the generic error state [src:277]', async () => {
    h.get.mockRejectedValue(new Error('kaboom'));
    renderAt('inv1');
    expect(await screen.findByText('kaboom')).toBeInTheDocument();
    expect(screen.getByText('Error · Error')).toBeInTheDocument();
  });

  // ── Non-ApiError ': Error' fallback bodies on each mutation onError ────────────
  it("issue failure with a non-ApiError falls back to 'Error' body [src:161]", async () => {
    h.get.mockResolvedValue(baseInvoice({ status: 'draft' }));
    h.issue.mockRejectedValue(new TypeError('network'));
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: /Emitir · Issue/i }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al emitir · Issue failed',
          body: 'Error',
        }),
      ),
    );
  });

  it("pay failure with a non-ApiError falls back to 'Error' body [src:176]", async () => {
    h.get.mockResolvedValue(baseInvoice({ status: 'issued' }));
    h.pay.mockRejectedValue(new TypeError('network'));
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: /Marcar pagado · Mark paid/i }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al marcar pagado · Pay failed',
          body: 'Error',
        }),
      ),
    );
  });

  it("void failure with a non-ApiError falls back to 'Error' body [src:191]", async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    h.get.mockResolvedValue(baseInvoice({ status: 'issued' }));
    h.void.mockRejectedValue(new TypeError('network'));
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: /Anular · Void/i }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al anular · Void failed',
          body: 'Error',
        }),
      ),
    );
  });

  it("delete failure with a non-ApiError falls back to 'Error' body [src:207]", async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    h.get.mockResolvedValue(baseInvoice({ status: 'draft' }));
    h.del.mockRejectedValue(new TypeError('network'));
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: /Eliminar · Delete/i }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al eliminar · Delete failed',
          body: 'Error',
        }),
      ),
    );
  });

  it("ref-save failure with a non-ApiError falls back to 'Error' body [src:67]", async () => {
    h.get.mockResolvedValue(baseInvoice({ externalInvoiceRef: null }));
    h.setExternalRef.mockRejectedValue(new TypeError('network'));
    renderAt();
    await screen.findByText('ANX-2026-0001');

    const input = screen.getByLabelText(/Número de factura TicketBAI · TicketBAI invoice number/i);
    await userEvent.type(input, 'TBS-X');
    await userEvent.click(screen.getByRole('button', { name: /Guardar · Save/i }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al guardar ref. · Save ref failed',
          body: 'Error',
        }),
      ),
    );
  });

  // ── Pending '...' labels while a mutation is in flight ────────────────────────
  it("renders the issue button '...' pending label while issuing [src:351]", async () => {
    h.get.mockResolvedValue(baseInvoice({ status: 'draft' }));
    h.issue.mockImplementation(never);
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: /Emitir · Issue/i }));
    expect(await screen.findByRole('button', { name: '...' })).toBeInTheDocument();
  });

  it("renders the pay button '...' pending label while paying [src:366]", async () => {
    h.get.mockResolvedValue(baseInvoice({ status: 'issued' }));
    h.pay.mockImplementation(never);
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: /Marcar pagado · Mark paid/i }));
    expect(await screen.findByRole('button', { name: '...' })).toBeInTheDocument();
  });

  it("renders the void button '...' pending label while voiding [src:379]", async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    h.get.mockResolvedValue(baseInvoice({ status: 'issued' }));
    h.void.mockImplementation(never);
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: /Anular · Void/i }));
    expect(await screen.findByRole('button', { name: '...' })).toBeInTheDocument();
  });

  it("renders the delete button '...' pending label while deleting [src:393]", async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    h.get.mockResolvedValue(baseInvoice({ status: 'draft' }));
    h.del.mockImplementation(never);
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: /Eliminar · Delete/i }));
    expect(await screen.findByRole('button', { name: '...' })).toBeInTheDocument();
  });

  it("renders the Save-ref button '...' pending label while saving the ref [src:121]", async () => {
    h.get.mockResolvedValue(baseInvoice({ externalInvoiceRef: null }));
    h.setExternalRef.mockImplementation(never);
    renderAt();
    await screen.findByText('ANX-2026-0001');

    const input = screen.getByLabelText(/Número de factura TicketBAI · TicketBAI invoice number/i);
    await userEvent.type(input, 'TBS-PENDING');
    await userEvent.click(screen.getByRole('button', { name: /Guardar · Save/i }));
    expect(await screen.findByRole('button', { name: '...' })).toBeInTheDocument();
  });
});
