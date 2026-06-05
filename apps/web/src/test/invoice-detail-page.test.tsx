// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import type { InvoiceView } from '@gira/shared';
import { renderWithProviders } from './render';

// vi.hoisted so the (hoisted) mock factory can close over the spies.
const h = vi.hoisted(() => ({
  get: vi.fn(),
  issue: vi.fn(),
  pay: vi.fn(),
  void: vi.fn(),
  del: vi.fn(),
  setExternalRef: vi.fn(),
  toast: vi.fn(),
}));

// Stable current-user object reference: declared once so the role can be flipped
// per-test without handing the page a new object on every render (which would
// re-fire seeding effects and flake the ref-editor sync).
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
  // Real-ish ApiError so `err instanceof ApiError` and `.status === 404` branches work.
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

// useMe returns the SAME object reference across renders (stable per-test).
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: meData.current }) }));

// Toast is consumed via context; renderWithProviders does not mount a ToastProvider,
// so the real hook returns a no-op. Mock the module so we can assert tone/title.
vi.mock('../ui/Toast', () => ({ useToast: () => h.toast }));

import { InvoiceDetailPage } from '../pages/InvoiceDetailPage';
import { ApiError } from '../api/client';

const createObjectUrlMock = vi.fn(() => 'blob:fake');

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

describe('InvoiceDetailPage', () => {
  beforeEach(() => {
    h.get.mockReset();
    h.issue.mockReset();
    h.pay.mockReset();
    h.void.mockReset();
    h.del.mockReset();
    h.setExternalRef.mockReset();
    h.toast.mockReset();
    meData.current = { role: 'admin' };
    // jsdom has no real object-URL plumbing; vi.spyOn can't stub a missing method,
    // so assign the props directly (then restore in afterEach).
    URL.createObjectURL = createObjectUrlMock as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as unknown as typeof URL.revokeObjectURL;
    createObjectUrlMock.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (URL as unknown as Record<string, unknown>).createObjectURL;
    delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
  });

  // ── Loading / error / not-found states ───────────────────────────────────
  it('shows the loading state while the invoice query is in flight', () => {
    h.get.mockReturnValue(new Promise(() => {})); // never resolves
    renderAt();
    expect(screen.getByText(/cargando anexo · loading annex/i)).toBeInTheDocument();
  });

  it('shows the not-found state on a 404 ApiError', async () => {
    h.get.mockRejectedValue(new ApiError(404, null, 'nope'));
    renderAt('missing');
    expect(await screen.findByText('Anexo no encontrado · Annex not found')).toBeInTheDocument();
    expect(screen.getByText('No encontrado · Not found')).toBeInTheDocument();
    // The back link is rendered in the error layout too.
    expect(screen.getByText('← Facturación · Billing')).toBeInTheDocument();
  });

  it('shows a generic error state (with the message) on a non-404 error', async () => {
    h.get.mockRejectedValue(new Error('boom'));
    renderAt('inv1');
    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(screen.getByText('Error · Error')).toBeInTheDocument();
  });

  // ── Loaded receipt ────────────────────────────────────────────────────────
  it('renders the annex receipt and its lines for the loaded invoice', async () => {
    h.get.mockResolvedValue(baseInvoice({ externalInvoiceRef: 'TBS-2026-0007' }));
    renderAt();
    expect(await screen.findByText('ANX-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    // Line content comes from InvoiceReceipt.
    expect(screen.getByText('work line one')).toBeInTheDocument();
    expect(screen.getByText('GIRA-1')).toBeInTheDocument();
    expect(h.get).toHaveBeenCalledWith('inv1');
  });

  // ── Issue (draft) ─────────────────────────────────────────────────────────
  it('issues a draft annex and toasts success', async () => {
    h.get.mockResolvedValue(baseInvoice({ status: 'draft' }));
    h.issue.mockResolvedValue(baseInvoice({ status: 'issued' }));
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: /Emitir · Issue/i }));
    await waitFor(() => expect(h.issue).toHaveBeenCalledWith('inv1'));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Anexo emitido · Annex issued' }),
      ),
    );
  });

  it('toasts an error when issuing fails (ApiError message surfaced)', async () => {
    h.get.mockResolvedValue(baseInvoice({ status: 'draft' }));
    h.issue.mockRejectedValue(new ApiError(409, null, 'already issued'));
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: /Emitir · Issue/i }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al emitir · Issue failed',
          body: 'already issued',
        }),
      ),
    );
  });

  // ── Pay (issued) ────────────────────────────────────────────────────────────
  it('marks an issued annex as paid and toasts success', async () => {
    h.get.mockResolvedValue(baseInvoice({ status: 'issued', issuedAt: '2026-06-02T00:00:00Z' }));
    h.pay.mockResolvedValue(baseInvoice({ status: 'paid' }));
    renderAt();
    await screen.findByText('ANX-2026-0001');
    // The "Emitir" button is gone for an issued annex.
    expect(screen.queryByRole('button', { name: /Emitir · Issue/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Marcar pagado · Mark paid/i }));
    await waitFor(() => expect(h.pay).toHaveBeenCalledWith('inv1'));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Anexo pagado · Annex paid' }),
      ),
    );
  });

  it('toasts an error when marking paid fails', async () => {
    h.get.mockResolvedValue(baseInvoice({ status: 'issued' }));
    h.pay.mockRejectedValue(new ApiError(400, null, 'bad state'));
    renderAt();
    await screen.findByText('ANX-2026-0001');
    await userEvent.click(screen.getByRole('button', { name: /Marcar pagado · Mark paid/i }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'danger', title: 'Error al marcar pagado · Pay failed' }),
      ),
    );
  });

  // ── Void (admin, confirm) ────────────────────────────────────────────────────
  it('voids an annex after confirm and toasts a warning', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    h.get.mockResolvedValue(baseInvoice({ status: 'issued' }));
    h.void.mockResolvedValue(baseInvoice({ status: 'void' }));
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: /Anular · Void/i }));
    expect(confirmSpy).toHaveBeenCalledWith('¿Anular este anexo? · Void this annex?');
    await waitFor(() => expect(h.void).toHaveBeenCalledWith('inv1'));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'warn', title: 'Anexo anulado · Annex voided' }),
      ),
    );
  });

  it('does not void when the confirm dialog is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    h.get.mockResolvedValue(baseInvoice({ status: 'issued' }));
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: /Anular · Void/i }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(h.void).not.toHaveBeenCalled();
  });

  it('toasts an error when voiding fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    h.get.mockResolvedValue(baseInvoice({ status: 'issued' }));
    h.void.mockRejectedValue(new ApiError(403, null, 'forbidden'));
    renderAt();
    await screen.findByText('ANX-2026-0001');
    await userEvent.click(screen.getByRole('button', { name: /Anular · Void/i }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'danger', title: 'Error al anular · Void failed' }),
      ),
    );
  });

  // ── Delete (admin, draft only, confirm + navigate) ───────────────────────────
  it('deletes a draft after confirm, toasts, and navigates back to billing', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    h.get.mockResolvedValue(baseInvoice({ status: 'draft' }));
    h.del.mockResolvedValue(undefined);
    renderAt();
    await screen.findByText('ANX-2026-0001');

    await userEvent.click(screen.getByRole('button', { name: /Eliminar · Delete/i }));
    expect(confirmSpy).toHaveBeenCalledWith(
      '¿Eliminar borrador ANX-2026-0001? · Delete draft ANX-2026-0001?',
    );
    await waitFor(() => expect(h.del).toHaveBeenCalledWith('inv1'));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Anexo eliminado · Annex deleted' }),
      ),
    );
    // navigate('/billing', { replace: true }) lands on the billing route element.
    expect(await screen.findByText('Billing landing')).toBeInTheDocument();
  });

  it('does not delete when the confirm dialog is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    h.get.mockResolvedValue(baseInvoice({ status: 'draft' }));
    renderAt();
    await screen.findByText('ANX-2026-0001');
    await userEvent.click(screen.getByRole('button', { name: /Eliminar · Delete/i }));
    expect(h.del).not.toHaveBeenCalled();
  });

  it('toasts an error when delete fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    h.get.mockResolvedValue(baseInvoice({ status: 'draft' }));
    h.del.mockRejectedValue(new ApiError(409, null, 'cannot delete'));
    renderAt();
    await screen.findByText('ANX-2026-0001');
    await userEvent.click(screen.getByRole('button', { name: /Eliminar · Delete/i }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'danger', title: 'Error al eliminar · Delete failed' }),
      ),
    );
  });

  // ── Status-conditioned action bar ────────────────────────────────────────────
  it('hides void/delete on a paid annex (no destructive actions)', async () => {
    h.get.mockResolvedValue(baseInvoice({ status: 'paid', paidAt: '2026-06-02T00:00:00Z' }));
    renderAt();
    await screen.findByText('ANX-2026-0001');
    expect(screen.queryByRole('button', { name: /Anular · Void/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar · Delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Emitir · Issue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Marcar pagado/i })).not.toBeInTheDocument();
  });

  it('non-admin staff (member) sees no void/delete buttons', async () => {
    meData.current = { role: 'member' };
    h.get.mockResolvedValue(baseInvoice({ status: 'issued' }));
    renderAt();
    await screen.findByText('ANX-2026-0001');
    // Pay is allowed for non-admin staff; void is admin-only.
    expect(screen.getByRole('button', { name: /Marcar pagado · Mark paid/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Anular · Void/i })).not.toBeInTheDocument();
  });

  it('a viewer sees only the print button and the receipt, not the action bar', async () => {
    meData.current = { role: 'viewer' };
    h.get.mockResolvedValue(baseInvoice({ status: 'draft' }));
    renderAt();
    await screen.findByText('ANX-2026-0001');
    expect(screen.queryByText('// acciones · actions')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Emitir · Issue/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Imprimir · Print/i })).toBeInTheDocument();
    // No ref editor for a viewer.
    expect(
      screen.queryByLabelText(/Número de factura TicketBAI · TicketBAI invoice number/i),
    ).not.toBeInTheDocument();
  });

  // ── CSV + print buttons (staff) ───────────────────────────────────────────────
  it('exports the annex as CSV when the CSV button is clicked', async () => {
    h.get.mockResolvedValue(baseInvoice({ status: 'draft' }));
    renderAt();
    await screen.findByText('ANX-2026-0001');
    await userEvent.click(screen.getByRole('button', { name: 'CSV' }));
    expect(createObjectUrlMock).toHaveBeenCalled();
  });

  it('calls window.print when the staff print button is clicked', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    h.get.mockResolvedValue(baseInvoice({ status: 'draft' }));
    renderAt();
    await screen.findByText('ANX-2026-0001');
    await userEvent.click(screen.getByRole('button', { name: /Imprimir · Print/i }));
    expect(printSpy).toHaveBeenCalled();
  });

  // ── External TicketBAI ref editor ─────────────────────────────────────────────
  it('saves the external ref via the Save button and toasts the new value', async () => {
    h.get.mockResolvedValue(baseInvoice({ externalInvoiceRef: null }));
    h.setExternalRef.mockResolvedValue(baseInvoice({ externalInvoiceRef: 'TBS-2026-0042' }));
    renderAt();
    await screen.findByText('ANX-2026-0001');

    const input = screen.getByLabelText(/Número de factura TicketBAI · TicketBAI invoice number/i);
    await userEvent.type(input, 'TBS-2026-0042');
    await userEvent.click(screen.getByRole('button', { name: /Guardar · Save/i }));

    await waitFor(() => expect(h.setExternalRef).toHaveBeenCalledWith('inv1', 'TBS-2026-0042'));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'ok',
          title: 'Ref. guardada · Ref saved',
          body: 'TBS-2026-0042',
        }),
      ),
    );
  });

  it('clears the external ref (empty input → null) and toasts the cleared placeholder', async () => {
    h.get.mockResolvedValue(baseInvoice({ externalInvoiceRef: 'TBS-2026-0001' }));
    h.setExternalRef.mockResolvedValue(baseInvoice({ externalInvoiceRef: null }));
    renderAt();
    await screen.findByText('ANX-2026-0001');

    const input = screen.getByLabelText(/Número de factura TicketBAI · TicketBAI invoice number/i);
    // The editor seeds from the current ref; clear it then save → null.
    await userEvent.clear(input);
    await userEvent.click(screen.getByRole('button', { name: /Guardar · Save/i }));

    await waitFor(() => expect(h.setExternalRef).toHaveBeenCalledWith('inv1', null));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', body: '(borrado · cleared)' }),
      ),
    );
  });

  it('saves the external ref when Enter is pressed in the input', async () => {
    h.get.mockResolvedValue(baseInvoice({ externalInvoiceRef: null }));
    h.setExternalRef.mockResolvedValue(baseInvoice({ externalInvoiceRef: 'TBS-ENTER' }));
    renderAt();
    await screen.findByText('ANX-2026-0001');

    const input = screen.getByLabelText(/Número de factura TicketBAI · TicketBAI invoice number/i);
    await userEvent.type(input, 'TBS-ENTER{Enter}');
    await waitFor(() => expect(h.setExternalRef).toHaveBeenCalledWith('inv1', 'TBS-ENTER'));
  });

  it('toasts an error when saving the external ref fails', async () => {
    h.get.mockResolvedValue(baseInvoice({ externalInvoiceRef: null }));
    h.setExternalRef.mockRejectedValue(new ApiError(422, null, 'invalid ref'));
    renderAt();
    await screen.findByText('ANX-2026-0001');

    const input = screen.getByLabelText(/Número de factura TicketBAI · TicketBAI invoice number/i);
    await userEvent.type(input, 'TBS-BAD');
    await userEvent.click(screen.getByRole('button', { name: /Guardar · Save/i }));
    await waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al guardar ref. · Save ref failed',
          body: 'invalid ref',
        }),
      ),
    );
  });
});
