// SPDX-License-Identifier: GPL-3.0-or-later
// Staff billing annex detail — receipt + action bar.
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoices, ApiError } from '../api/client';
import { useMe } from '../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { InvoiceReceipt } from '../ui/InvoiceReceipt';
import { centsToDecimal, downloadCsv } from '../lib/csv';
import type { InvoiceView } from '@gira/shared';

function exportAnnexCsv(inv: InvoiceView): void {
  downloadCsv(inv.number, [
    ['Anexo · Annex', inv.number],
    ['Cliente · Client', inv.clientName],
    ['Moneda · Currency', inv.currency],
    ['Factura TicketBAI · TicketBAI invoice', inv.externalInvoiceRef ?? ''],
    [],
    ['Issue', 'Descripción · Description', 'Minutos · Minutes', 'Horas · Hours', 'Tarifa/h · Rate/h', 'Importe · Amount'],
    ...inv.lines.map((l) => [
      l.issueKey,
      l.description,
      l.minutes,
      (l.minutes / 60).toFixed(2),
      l.hourlyCents != null ? centsToDecimal(l.hourlyCents) : '',
      centsToDecimal(l.amountCents),
    ]),
    [],
    ['', '', '', '', 'TOTAL', centsToDecimal(inv.subtotalCents)],
  ]);
}

// ── External TicketBAI ref editor ────────────────────────────────────────────

function ExternalRefEditor({ invoiceId, current }: { invoiceId: string; current: string | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [value, setValue] = useState(current ?? '');

  // Keep in sync if the query refreshes
  useEffect(() => {
    setValue(current ?? '');
  }, [current]);

  const refMut = useMutation({
    mutationFn: () => invoices.setExternalRef(invoiceId, value.trim() || null),
    onSuccess: (inv) => {
      void qc.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        tone: 'ok',
        title: 'Ref. guardada · Ref saved',
        body: inv.externalInvoiceRef ?? '(borrado · cleared)',
      });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al guardar ref. · Save ref failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    padding: '5px 10px',
    border: '1.5px solid var(--eg-iron)',
    background: 'var(--eg-paper)',
    color: 'var(--eg-iron)',
    outline: 'none',
    minWidth: 200,
    letterSpacing: '0.06em',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <label
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'var(--eg-fg-3)',
          whiteSpace: 'nowrap',
        }}
      >
        // factura ticketbai · ticketbai invoice
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') refMut.mutate();
        }}
        placeholder="TBS-YYYY-NNNN"
        style={inputStyle}
        aria-label="Número de factura TicketBAI · TicketBAI invoice number"
      />
      <button
        className="b-btn"
        onClick={() => refMut.mutate()}
        disabled={refMut.isPending}
        style={{ fontSize: 12 }}
      >
        {refMut.isPending ? '...' : 'Guardar · Save'}
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const me = useMe();

  const invoiceQ = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => invoices.get(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  const isViewer = me.data?.role === 'viewer';
  // Void & delete are destructive billing actions — admin only (matches the API).
  const isAdmin = me.data?.role === 'admin';

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ['invoices'] });
  }

  const issueMut = useMutation({
    mutationFn: () => invoices.issue(id!),
    onSuccess: (inv) => {
      invalidate();
      toast({ tone: 'ok', title: 'Anexo emitido · Annex issued', body: inv.number });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al emitir · Issue failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const payMut = useMutation({
    mutationFn: () => invoices.pay(id!),
    onSuccess: (inv) => {
      invalidate();
      toast({ tone: 'ok', title: 'Anexo pagado · Annex paid', body: inv.number });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al marcar pagado · Pay failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const voidMut = useMutation({
    mutationFn: () => invoices.void(id!),
    onSuccess: (inv) => {
      invalidate();
      toast({ tone: 'warn', title: 'Anexo anulado · Annex voided', body: inv.number });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al anular · Void failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => invoices.delete(id!),
    onSuccess: () => {
      invalidate();
      toast({ tone: 'ok', title: 'Anexo eliminado · Annex deleted' });
      navigate('/billing', { replace: true });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al eliminar · Delete failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const anyPending =
    issueMut.isPending || payMut.isPending || voidMut.isPending || deleteMut.isPending;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (invoiceQ.isLoading) {
    return (
      <div className="body">
        <div className="gs-state">
          <span className="gs-loading">cargando anexo · loading annex</span>
        </div>
      </div>
    );
  }

  // ── Error / 404 ───────────────────────────────────────────────────────────
  if (invoiceQ.isError || !invoiceQ.data) {
    const is404 =
      invoiceQ.error instanceof ApiError && invoiceQ.error.status === 404;
    return (
      <div className="body">
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>
          <Link
            to="/billing"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--eg-fg-3)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 24,
            }}
          >
            ← Facturación · Billing
          </Link>
          <div className="gs-state" style={{ minHeight: 200 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--eg-fg-3)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  background: 'var(--eg-red)',
                  color: 'var(--eg-paper)',
                  padding: '6px 14px',
                  fontWeight: 700,
                  display: 'inline-block',
                  marginBottom: 12,
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {is404 ? 'No encontrado · Not found' : 'Error · Error'}
              </div>
              <p style={{ margin: 0 }}>
                {is404
                  ? 'Anexo no encontrado · Annex not found'
                  : invoiceQ.error instanceof Error
                    ? invoiceQ.error.message
                    : 'No se pudo cargar el anexo · Could not load annex'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inv = invoiceQ.data;

  return (
    <div className="body">
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '18px 22px',
          background: 'var(--eg-paper)',
        }}
      >
        {/* Back link */}
        <Link
          to="/billing"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--eg-fg-3)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 20,
          }}
        >
          ← Facturación · Billing
        </Link>

        {/* Action bar — hidden in print */}
        {!isViewer && (
          <div className="invoice-action-bar" style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--eg-paper-2)',
                border: '2px solid var(--eg-iron)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'var(--eg-fg-3)',
                  marginRight: 8,
                }}
              >
                // acciones · actions
              </span>

              {inv.status === 'draft' && (
                <button
                  className="b-btn b-btn--yellow"
                  onClick={() => issueMut.mutate()}
                  disabled={anyPending}
                  style={{ fontSize: 12 }}
                >
                  {issueMut.isPending ? '...' : 'Emitir · Issue'}
                </button>
              )}

              {inv.status === 'issued' && (
                <button
                  className="b-btn b-btn--ink"
                  onClick={() => payMut.mutate()}
                  disabled={anyPending}
                  style={{ fontSize: 12, background: 'var(--eg-green)', borderColor: 'var(--eg-green)' }}
                >
                  {payMut.isPending ? '...' : 'Marcar pagado · Mark paid'}
                </button>
              )}

              {isAdmin && inv.status !== 'paid' && inv.status !== 'void' && (
                <button
                  className="b-btn b-btn--ghost"
                  onClick={() => {
                    if (confirm('¿Anular este anexo? · Void this annex?')) voidMut.mutate();
                  }}
                  disabled={anyPending}
                  style={{ fontSize: 12 }}
                >
                  {voidMut.isPending ? '...' : 'Anular · Void'}
                </button>
              )}

              {isAdmin && inv.status === 'draft' && (
                <button
                  className="b-btn b-btn--ghost"
                  onClick={() => {
                    if (confirm(`¿Eliminar borrador ${inv.number}? · Delete draft ${inv.number}?`))
                      deleteMut.mutate();
                  }}
                  disabled={anyPending}
                  style={{ fontSize: 12, color: 'var(--eg-red)' }}
                >
                  {deleteMut.isPending ? '...' : 'Eliminar · Delete'}
                </button>
              )}

              <span style={{ flex: 1 }} />

              <button className="b-btn" onClick={() => exportAnnexCsv(inv)} style={{ fontSize: 12 }}>
                CSV
              </button>
              <button
                className="b-btn"
                onClick={() => window.print()}
                style={{ fontSize: 12 }}
              >
                Imprimir · Print
              </button>
            </div>
          </div>
        )}

        {/* External TicketBAI ref editor — staff only, hidden in print */}
        {!isViewer && (
          <div
            className="invoice-action-bar"
            style={{ marginBottom: 20 }}
          >
            <div
              style={{
                padding: '10px 16px',
                background: 'var(--eg-paper-2)',
                border: '1.5px solid var(--eg-rule)',
                borderTop: 'none',
              }}
            >
              <ExternalRefEditor invoiceId={inv.id} current={inv.externalInvoiceRef} />
            </div>
          </div>
        )}

        {/* Viewer print button */}
        {isViewer && (
          <div className="invoice-action-bar" style={{ marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '12px 16px',
                background: 'var(--eg-paper-2)',
                border: '2px solid var(--eg-iron)',
              }}
            >
              <button className="b-btn" onClick={() => window.print()} style={{ fontSize: 12 }}>
                Imprimir · Print
              </button>
            </div>
          </div>
        )}

        {/* Receipt */}
        <InvoiceReceipt invoice={inv} />
      </div>
    </div>
  );
}
