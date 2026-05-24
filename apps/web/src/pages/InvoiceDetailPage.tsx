// SPDX-License-Identifier: GPL-3.0-or-later
// Staff invoice detail — receipt + action bar.
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoices, ApiError } from '../api/client';
import { useMe } from '../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { InvoiceReceipt } from '../ui/InvoiceReceipt';

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

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ['invoices'] });
  }

  const issueMut = useMutation({
    mutationFn: () => invoices.issue(id!),
    onSuccess: (inv) => {
      invalidate();
      toast({ tone: 'ok', title: 'Factura emitida · Invoice issued', body: inv.number });
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
      toast({ tone: 'ok', title: 'Factura pagada · Invoice paid', body: inv.number });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al marcar pagada · Pay failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const voidMut = useMutation({
    mutationFn: () => invoices.void(id!),
    onSuccess: (inv) => {
      invalidate();
      toast({ tone: 'warn', title: 'Factura anulada · Invoice voided', body: inv.number });
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
      toast({ tone: 'ok', title: 'Factura eliminada · Invoice deleted' });
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
          <span className="gs-loading">cargando factura · loading invoice</span>
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
                {is404 ? 'No encontrada · Not found' : 'Error · Error'}
              </div>
              <p style={{ margin: 0 }}>
                {is404
                  ? 'Factura no encontrada · Invoice not found'
                  : invoiceQ.error instanceof Error
                    ? invoiceQ.error.message
                    : 'No se pudo cargar la factura · Could not load invoice'}
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
          <div className="invoice-action-bar" style={{ marginBottom: 20 }}>
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
                  {payMut.isPending ? '...' : 'Marcar pagada · Mark paid'}
                </button>
              )}

              {inv.status !== 'paid' && inv.status !== 'void' && (
                <button
                  className="b-btn b-btn--ghost"
                  onClick={() => {
                    if (confirm('¿Anular esta factura? · Void this invoice?')) voidMut.mutate();
                  }}
                  disabled={anyPending}
                  style={{ fontSize: 12 }}
                >
                  {voidMut.isPending ? '...' : 'Anular · Void'}
                </button>
              )}

              {inv.status === 'draft' && (
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
