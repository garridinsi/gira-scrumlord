// SPDX-License-Identifier: GPL-3.0-or-later
// Portal billing annex detail — read-only, print only.
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portal, ApiError } from '../../api/client';
import { InvoiceReceipt } from '../../ui/InvoiceReceipt';

export function PortalInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();

  const invoiceQ = useQuery({
    queryKey: ['portal', 'invoices', id],
    queryFn: () => portal.invoice(id!),
    enabled: !!id,
    staleTime: 60_000,
    retry: (count, err) => {
      // Don't retry 404s
      if (err instanceof ApiError && err.status === 404) return false;
      return count < 2;
    },
  });

  const backLink = (
    <Link
      to="/portal/invoices"
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
      ← Anexos · Annexes
    </Link>
  );

  if (invoiceQ.isLoading) {
    return (
      <div className="cp-detail">
        {backLink}
        <div className="gs-state" style={{ minHeight: 200 }}>
          <span className="gs-loading">cargando anexo · loading annex</span>
        </div>
      </div>
    );
  }

  if (invoiceQ.isError || !invoiceQ.data) {
    const is404 =
      invoiceQ.error instanceof ApiError && invoiceQ.error.status === 404;
    return (
      <div className="cp-detail">
        {backLink}
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
    );
  }

  const inv = invoiceQ.data;

  return (
    <div className="cp-detail" style={{ maxWidth: 960 }}>
      {backLink}

      {/* Print button — hidden in print */}
      <div className="invoice-action-bar" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '10px 14px',
            background: 'var(--eg-paper-2)',
            border: '1.5px solid var(--eg-rule)',
          }}
        >
          <button
            type="button"
            className="b-btn"
            onClick={() => window.print()}
            style={{ fontSize: 12 }}
          >
            Imprimir · Print
          </button>
        </div>
      </div>

      {/* Receipt */}
      <InvoiceReceipt invoice={inv} />
    </div>
  );
}
