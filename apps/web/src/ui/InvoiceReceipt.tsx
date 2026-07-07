// SPDX-License-Identifier: GPL-3.0-or-later
// Printable billing annex receipt — EG "Mantenedor" design. Presentation-only.
// NOT a fiscal invoice. Fiscal invoices are issued via TicketBAI / Batuz.
import type { InvoiceLineKind, InvoiceView } from '@gira/shared';
import { Glyph, Plate } from './atoms';
import { formatMoney } from '../lib/money';
import { formatMinutes, formatDate } from '../lib/format';

// ── Billing-type badge ─────────────────────────────────────────────────────────
// A single annex can mix T&M hourly, fixed-price and retainer-covered lines. Each
// line carries a derived `kind` so the client can tell at a glance what they're
// being charged for (or not — maintenance shows the hours done at €0).

const KIND_BADGES: Record<
  InvoiceLineKind,
  { mark: string; es: string; en: string; bg: string; fg: string; border: string }
> = {
  billable: {
    mark: '✓',
    es: 'Facturable',
    en: 'billable',
    bg: 'var(--eg-green)',
    fg: 'var(--eg-paper)',
    border: 'var(--eg-iron)',
  },
  fixed: {
    mark: '◆',
    es: 'Precio fijo',
    en: 'fixed price',
    bg: 'var(--eg-paper-3)',
    fg: 'var(--eg-iron)',
    border: 'var(--eg-iron)',
  },
  covered: {
    mark: '✓',
    es: 'Cubierto',
    en: 'covered',
    bg: 'var(--eg-paper-2)',
    fg: 'var(--eg-fg-2)',
    border: 'var(--eg-rule)',
  },
  retainer: {
    mark: '▣',
    es: 'Cuota',
    en: 'retainer fee',
    bg: 'var(--eg-yellow)',
    fg: 'var(--eg-iron)',
    border: 'var(--eg-iron)',
  },
};

function KindBadge({ kind }: { kind: InvoiceLineKind }) {
  const cfg = KIND_BADGES[kind];
  return (
    <span
      data-testid={`line-kind-${kind}`}
      style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: 9.5,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        padding: '1px 6px',
        border: '1px solid',
        background: cfg.bg,
        color: cfg.fg,
        borderColor: cfg.border,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden style={{ fontWeight: 900 }}>
        {cfg.mark}
      </span>
      {cfg.es}
      <span style={{ opacity: 0.6 }}>· {cfg.en}</span>
    </span>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InvoiceView['status'] }) {
  const configs = {
    draft: {
      es: 'Borrador',
      en: 'Draft',
      style: {
        background: 'var(--eg-paper-3)',
        color: 'var(--eg-iron)',
        borderColor: 'var(--eg-iron)',
        textDecoration: 'none' as const,
      },
    },
    issued: {
      es: 'Emitida',
      en: 'Issued',
      style: {
        background: 'var(--eg-yellow)',
        color: 'var(--eg-iron)',
        borderColor: 'var(--eg-iron)',
        textDecoration: 'none' as const,
      },
    },
    paid: {
      es: 'Pagada',
      en: 'Paid',
      style: {
        background: 'var(--eg-green)',
        color: 'var(--eg-paper)',
        borderColor: 'var(--eg-iron)',
        textDecoration: 'none' as const,
      },
    },
    void: {
      es: 'Anulada',
      en: 'Void',
      style: {
        background: 'var(--eg-paper-2)',
        color: 'var(--eg-fg-4)',
        borderColor: 'var(--eg-rule)',
        textDecoration: 'line-through' as const,
      },
    },
  } as const;

  const cfg = configs[status];
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        padding: '4px 12px',
        border: '1.5px solid',
        display: 'inline-block',
        ...cfg.style,
      }}
    >
      <span style={{ textDecoration: cfg.style.textDecoration }}>
        {cfg.es} · {cfg.en}
      </span>
    </span>
  );
}

// ── Non-fiscal disclaimer ────────────────────────────────────────────────────

function AnnexDisclaimer() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        margin: '0 0 20px',
        padding: '10px 14px',
        background: 'var(--eg-paper-2)',
        border: '2px solid var(--eg-iron)',
        borderLeft: '5px solid var(--eg-iron)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 900,
          fontSize: 18,
          color: 'var(--eg-iron)',
          lineHeight: 1,
          flexShrink: 0,
          marginTop: 1,
        }}
        aria-hidden
      >
        //
      </span>
      <div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--eg-iron)',
            marginBottom: 3,
          }}
        >
          Documento informativo · Informational document
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--eg-fg-2)',
            lineHeight: 1.5,
          }}
        >
          No es una factura fiscal. La factura se emite mediante TicketBAI / Batuz.
          <span style={{ color: 'var(--eg-fg-4)', marginLeft: 6 }}>
            · Not a fiscal invoice. The invoice is issued via TicketBAI / Batuz.
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Covered-time footer ──────────────────────────────────────────────────────
// Totals the time of every "covered" line and states it explicitly: under a retainer
// that time is included in the flat monthly fee (no extra charge); without one it is
// simply tracked-but-not-billed. Hidden when nothing is covered.

function CoveredFooter({ invoice }: { invoice: InvoiceView }) {
  const coveredMinutes = invoice.lines
    .filter((l) => l.kind === 'covered')
    .reduce((sum, l) => sum + l.minutes, 0);
  if (coveredMinutes === 0) return null;
  const hasRetainer = invoice.lines.some((l) => l.kind === 'retainer');

  return (
    <div
      data-testid="covered-footer"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        margin: '18px 0 0',
        padding: '10px 14px',
        background: 'var(--eg-paper-2)',
        border: '2px solid var(--eg-iron)',
        borderLeft: '5px solid var(--eg-green)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 900,
          fontSize: 16,
          color: 'var(--eg-green)',
          lineHeight: 1,
          flexShrink: 0,
          marginTop: 1,
        }}
        aria-hidden
      >
        ✓
      </span>
      <div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--eg-iron)',
            marginBottom: 3,
          }}
        >
          Tiempo cubierto · Covered time: {formatMinutes(coveredMinutes)}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--eg-fg-2)',
            lineHeight: 1.5,
          }}
        >
          {hasRetainer ? (
            <>
              Incluido en la cuota fija mensual, sin coste adicional.
              <span style={{ color: 'var(--eg-fg-4)', marginLeft: 6 }}>
                · Included in the flat monthly fee, at no extra charge.
              </span>
            </>
          ) : (
            <>
              Trabajo cubierto, no facturado.
              <span style={{ color: 'var(--eg-fg-4)', marginLeft: 6 }}>
                · Covered work, not billed.
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main receipt component ───────────────────────────────────────────────────

export function InvoiceReceipt({ invoice }: { invoice: InvoiceView }) {
  const hasPeriod = invoice.periodStart || invoice.periodEnd;

  return (
    <article className="invoice-receipt">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="invoice-receipt__header">
        <div className="invoice-receipt__brand">
          <Glyph />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 24,
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              color: 'var(--eg-iron)',
              lineHeight: 1,
            }}
          >
            GIRA
          </span>
        </div>

        <div className="invoice-receipt__title-block">
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(22px, 4vw, 42px)',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              color: 'var(--eg-iron)',
              margin: 0,
              lineHeight: 0.9,
            }}
          >
            ANEXO DE FACTURACIÓN
          </h1>
          <div
            style={{
              fontFamily: 'var(--font-stencil)',
              fontWeight: 700,
              fontSize: 16,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--eg-fg-3)',
              marginTop: 2,
            }}
          >
            BILLING ANNEX
          </div>
        </div>

        <div className="invoice-receipt__number-block">
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: 'var(--eg-fg-3)',
              marginBottom: 4,
            }}
          >
            // ref. anexo · annex ref
          </div>
          <Plate>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.08em',
              }}
            >
              {/* Drafts have no number until issued — show a clear placeholder. */}
              {invoice.number ?? 'BORRADOR · DRAFT'}
            </span>
          </Plate>
          <div style={{ marginTop: 8 }}>
            <StatusBadge status={invoice.status} />
          </div>
        </div>
      </div>

      {/* ── Non-fiscal disclaimer ────────────────────────────── */}
      <AnnexDisclaimer />

      {/* ── Meta ────────────────────────────────────────────── */}
      <div className="invoice-receipt__meta">
        <div className="invoice-receipt__meta-row">
          <div className="invoice-receipt__meta-cell">
            <div className="invoice-receipt__meta-label">// cliente · client</div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 20,
                textTransform: 'uppercase',
                color: 'var(--eg-iron)',
                lineHeight: 1.1,
              }}
            >
              {invoice.clientName}
            </div>
          </div>

          <div className="invoice-receipt__meta-cell">
            <div className="invoice-receipt__meta-label">// período · period</div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--eg-iron)',
              }}
            >
              {hasPeriod ? (
                <>
                  {invoice.periodStart ? formatDate(invoice.periodStart) : '—'}
                  {' – '}
                  {invoice.periodEnd ? formatDate(invoice.periodEnd) : '—'}
                </>
              ) : (
                <span>
                  todo el trabajo
                  <span style={{ color: 'var(--eg-fg-4)', marginLeft: 6 }}>· all work</span>
                </span>
              )}
            </div>
          </div>

          <div className="invoice-receipt__meta-cell">
            <div className="invoice-receipt__meta-label">// fechas · dates</div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <span style={{ color: 'var(--eg-fg-3)' }}>
                <span
                  style={{
                    color: 'var(--eg-fg-4)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  creada ·{' '}
                </span>
                {formatDate(invoice.createdAt)}
              </span>
              {invoice.issuedAt && (
                <span style={{ color: 'var(--eg-fg-3)' }}>
                  <span
                    style={{
                      color: 'var(--eg-fg-4)',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    emitida ·{' '}
                  </span>
                  {formatDate(invoice.issuedAt)}
                </span>
              )}
              {invoice.paidAt && (
                <span style={{ color: 'var(--eg-green)' }}>
                  <span
                    style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  >
                    pagada ·{' '}
                  </span>
                  {formatDate(invoice.paidAt)}
                </span>
              )}
              {invoice.externalInvoiceRef && (
                <span
                  style={{
                    color: 'var(--eg-iron)',
                    marginTop: 4,
                    paddingTop: 4,
                    borderTop: '1px dashed var(--eg-rule)',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--eg-fg-4)',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: 1,
                    }}
                  >
                    factura ticketbai · ticketbai invoice
                  </span>
                  <span style={{ fontWeight: 700, letterSpacing: '0.06em' }}>
                    {invoice.externalInvoiceRef}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Lines table ───────────────────────────────────────
          A real <table> so the column headings repeat on every printed
          page (thead = table-header-group) — a continuation page reads as
          a proper document, not a screenshot cut off mid-list. */}
      <table className="invoice-receipt__lines">
        <colgroup>
          <col className="invoice-receipt__cg--issue" />
          <col className="invoice-receipt__cg--desc" />
          <col className="invoice-receipt__cg--time" />
          <col className="invoice-receipt__cg--rate" />
          <col className="invoice-receipt__cg--amount" />
        </colgroup>
        <thead>
          <tr className="invoice-receipt__line invoice-receipt__line--head">
            <th className="invoice-receipt__col invoice-receipt__col--issue">
              <span className="invoice-receipt__col-es">ISSUE</span>
            </th>
            <th className="invoice-receipt__col invoice-receipt__col--desc">
              <span className="invoice-receipt__col-es">DESCRIPCIÓN</span>
              <span className="invoice-receipt__col-en">DESCRIPTION</span>
            </th>
            <th className="invoice-receipt__col invoice-receipt__col--time">
              <span className="invoice-receipt__col-es">TIEMPO</span>
              <span className="invoice-receipt__col-en">TIME</span>
            </th>
            <th className="invoice-receipt__col invoice-receipt__col--rate">
              <span className="invoice-receipt__col-es">TARIFA</span>
              <span className="invoice-receipt__col-en">RATE</span>
            </th>
            <th className="invoice-receipt__col invoice-receipt__col--amount invoice-receipt__col--right">
              <span className="invoice-receipt__col-es">IMPORTE</span>
              <span className="invoice-receipt__col-en">AMOUNT</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Data rows */}
          {invoice.lines.map((line, i) => (
            <tr
              key={line.id}
              className="invoice-receipt__line"
              style={{ background: i % 2 ? 'var(--eg-paper)' : 'var(--eg-paper-2)' }}
            >
              <td className="invoice-receipt__col invoice-receipt__col--issue">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'var(--eg-iron)',
                    color: 'var(--eg-yellow)',
                    padding: '2px 7px',
                    display: 'inline-block',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {line.issueKey}
                </span>
              </td>
              <td className="invoice-receipt__col invoice-receipt__col--desc">
                <span
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--eg-fg-1)',
                      lineHeight: 1.4,
                    }}
                  >
                    {line.description}
                  </span>
                  <KindBadge kind={line.kind} />
                </span>
              </td>
              <td className="invoice-receipt__col invoice-receipt__col--time">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--eg-iron)',
                  }}
                >
                  {formatMinutes(line.minutes)}
                </span>
              </td>
              <td className="invoice-receipt__col invoice-receipt__col--rate">
                {line.hourlyCents !== null ? (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--eg-iron)',
                    }}
                  >
                    {formatMoney(line.hourlyCents, invoice.currency)}
                    <span style={{ color: 'var(--eg-fg-3)', fontSize: 10 }}>/h</span>
                  </span>
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--eg-fg-3)',
                    }}
                  >
                    {line.kind === 'covered'
                      ? 'incluido · included'
                      : line.kind === 'retainer'
                        ? 'cuota mensual · monthly'
                        : 'precio fijo · fixed'}
                  </span>
                )}
              </td>
              <td className="invoice-receipt__col invoice-receipt__col--amount invoice-receipt__col--right">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--eg-iron)',
                  }}
                >
                  {formatMoney(line.amountCents, invoice.currency)}
                </span>
              </td>
            </tr>
          ))}

          {/* Empty state */}
          {invoice.lines.length === 0 && (
            <tr>
              <td
                colSpan={5}
                style={{
                  padding: '32px 20px',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--eg-fg-4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                sin líneas · no lines
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Total row — a sibling of the table so it prints once at the end,
          not repeated per page the way a <tfoot> group would be. */}
      <div className="invoice-receipt__total">
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: 'var(--eg-fg-3)',
            paddingRight: 20,
          }}
        >
          TOTAL ANEXO · ANNEX TOTAL
        </span>
        <Plate tone="yellow" style={{ fontSize: 16, padding: '8px 18px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: '0.02em',
            }}
          >
            {formatMoney(invoice.subtotalCents, invoice.currency)}
          </span>
        </Plate>
      </div>

      {/* ── Covered-time footer ─────────────────────────────── */}
      <CoveredFooter invoice={invoice} />

      {/* ── Notes ───────────────────────────────────────────── */}
      {invoice.notes && (
        <div className="invoice-receipt__notes">
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: 'var(--eg-fg-3)',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ color: 'var(--eg-yellow)' }}>//</span>
            notas · notes
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--eg-fg-1)',
              whiteSpace: 'pre-wrap',
              background: 'var(--eg-paper-2)',
              border: '1px solid var(--eg-rule)',
              padding: '14px 16px',
            }}
          >
            {invoice.notes}
          </div>
        </div>
      )}
    </article>
  );
}
