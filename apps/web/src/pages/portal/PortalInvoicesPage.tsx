// SPDX-License-Identifier: GPL-3.0-or-later
// Portal invoice list — client-facing, read-only, issued/paid only.
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { InvoiceListItemView } from '@gira/shared';
import { portal } from '../../api/client';
import { formatMoney } from '../../lib/money';
import { formatDate } from '../../lib/format';

function StatusBadge({ status }: { status: InvoiceListItemView['status'] }) {
  const map: Record<InvoiceListItemView['status'], { es: string; en: string; bg: string; color: string }> = {
    draft: { es: 'Borrador', en: 'Draft', bg: 'var(--eg-paper-3)', color: 'var(--eg-iron)' },
    issued: { es: 'Emitida', en: 'Issued', bg: 'var(--eg-yellow)', color: 'var(--eg-iron)' },
    paid: { es: 'Pagada', en: 'Paid', bg: 'var(--eg-green)', color: 'var(--eg-paper)' },
    void: { es: 'Anulada', en: 'Void', bg: 'var(--eg-paper-2)', color: 'var(--eg-fg-4)' },
  };
  const cfg = map[status];
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        padding: '3px 10px',
        background: cfg.bg,
        color: cfg.color,
        border: '1.5px solid var(--eg-iron)',
        display: 'inline-block',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.es} · {cfg.en}
    </span>
  );
}

export function PortalInvoicesPage() {
  const navigate = useNavigate();

  const invoicesQ = useQuery({
    queryKey: ['portal', 'invoices'],
    queryFn: () => portal.invoices(),
    staleTime: 60_000,
  });

  if (invoicesQ.isLoading) {
    return (
      <div className="gs-state">
        <span className="gs-loading">cargando anexos · loading annexes</span>
      </div>
    );
  }

  if (invoicesQ.isError) {
    return (
      <div className="gs-state">
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
            Error · Error
          </div>
          <p style={{ margin: 0 }}>
            {invoicesQ.error instanceof Error
              ? invoicesQ.error.message
              : 'No se pudieron cargar los anexos · Could not load annexes'}
          </p>
        </div>
      </div>
    );
  }

  const data = invoicesQ.data ?? [];

  return (
    <div className="cp-page cp-page--wide">
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: 'var(--eg-yellow)',
            marginBottom: 6,
          }}
        >
          // portal · client portal
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(28px, 5vw, 48px)',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            color: 'var(--eg-iron)',
            margin: 0,
            lineHeight: 1,
          }}
        >
          Anexos
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-stencil)',
            fontWeight: 700,
            fontSize: 14,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--eg-fg-3)',
            margin: '4px 0 0',
          }}
        >
          Anexos de facturación · Billing annexes (documentos informativos · informational documents)
        </p>
      </div>

      {/* Empty state */}
      {data.length === 0 && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--eg-fg-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            padding: '60px 0',
            textAlign: 'center',
          }}
        >
          No hay anexos todavía · No annexes yet
        </div>
      )}

      {/* Invoice list */}
      {data.length > 0 && (
        <div style={{ border: '2px solid var(--eg-iron)' }}>
          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '150px 165px minmax(180px, 1fr) 150px 130px',
              gap: 0,
              background: 'var(--eg-paper-3)',
              borderBottom: '1.5px solid var(--eg-iron)',
              padding: '8px 16px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--eg-fg-3)',
            }}
          >
            <span>// ref. anexo · annex ref</span>
            <span>// estado · status</span>
            <span>// período · period</span>
            <span>// importe · amount</span>
            <span>// fecha · date</span>
          </div>

          {data.map((inv, i) => (
            <button
              key={inv.id}
              type="button"
              onClick={() => navigate(`/portal/invoices/${inv.id}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '150px 165px minmax(180px, 1fr) 150px 130px',
                gap: 0,
                alignItems: 'center',
                padding: '14px 16px',
                background: i % 2 ? 'var(--eg-paper)' : 'var(--eg-paper-2)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                border: 'none',
                borderBottom: i < data.length - 1 ? '1px dashed var(--eg-rule)' : 'none',
                transition: 'background var(--dur-1)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--eg-paper-3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  i % 2 ? 'var(--eg-paper)' : 'var(--eg-paper-2)';
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: 13,
                  color: 'var(--eg-iron)',
                  letterSpacing: '0.06em',
                }}
              >
                {inv.number}
              </span>
              <span>
                <StatusBadge status={inv.status} />
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--eg-fg-3)',
                }}
              >
                {inv.periodStart || inv.periodEnd ? (
                  <>
                    {inv.periodStart ? formatDate(inv.periodStart) : '—'}
                    {' – '}
                    {inv.periodEnd ? formatDate(inv.periodEnd) : '—'}
                  </>
                ) : (
                  'todo el trabajo · all work'
                )}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: 13,
                  color: 'var(--eg-iron)',
                }}
              >
                {formatMoney(inv.subtotalCents, inv.currency)}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--eg-fg-3)',
                }}
              >
                {formatDate(inv.createdAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
