// SPDX-License-Identifier: GPL-3.0-or-later
// Staff billing page — client selector, billing annex list, generate form.
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InvoiceListItemView } from '@gira/shared';
import { invoices, clients, ApiError } from '../api/client';
import { useMe } from '../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { Plate } from '../ui/atoms';
import { formatMoney } from '../lib/money';
import { formatDate } from '../lib/format';

// ── Status badge (inline) ────────────────────────────────────────────────────

function InvoiceStatusBadge({ status }: { status: InvoiceListItemView['status'] }) {
  const map: Record<
    InvoiceListItemView['status'],
    { es: string; en: string; bg: string; color: string; strike?: boolean }
  > = {
    draft: { es: 'Borrador', en: 'Draft', bg: 'var(--eg-paper-3)', color: 'var(--eg-iron)' },
    issued: { es: 'Emitida', en: 'Issued', bg: 'var(--eg-yellow)', color: 'var(--eg-iron)' },
    paid: { es: 'Pagada', en: 'Paid', bg: 'var(--eg-green)', color: 'var(--eg-paper)' },
    void: { es: 'Anulada', en: 'Void', bg: 'var(--eg-paper-2)', color: 'var(--eg-fg-4)', strike: true },
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
        padding: '3px 8px',
        background: cfg.bg,
        color: cfg.color,
        border: '1.5px solid var(--eg-iron)',
        textDecoration: cfg.strike ? 'line-through' : 'none',
        display: 'inline-block',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.es} · {cfg.en}
    </span>
  );
}

// ── Generate form ────────────────────────────────────────────────────────────

function GenerateForm({ clientId, currency }: { clientId: string; currency: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');

  const generateMut = useMutation({
    mutationFn: () =>
      invoices.generate(clientId, {
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        notes: notes || undefined,
      }),
    onSuccess: (inv) => {
      void qc.invalidateQueries({ queryKey: ['invoices', 'client', clientId] });
      toast({ tone: 'ok', title: 'Anexo generado · Annex generated', body: inv.number });
      navigate(`/invoices/${inv.id}`);
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al generar · Generate failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const inputStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    padding: '6px 10px',
    border: '1.5px solid var(--eg-iron)',
    background: 'var(--eg-paper)',
    color: 'var(--eg-iron)',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  return (
    <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)' }}>
      <div
        className="tag-head"
        style={{ background: 'var(--eg-iron)', color: 'var(--eg-yellow)', padding: '8px 14px' }}
      >
        <span>// GENERAR ANEXO · GENERATE ANNEX</span>
        <span style={{ color: 'var(--eg-fg-4)' }}>{currency}</span>
      </div>
      <div
        style={{
          padding: '16px 18px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14,
          alignItems: 'end',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
            // inicio período · period start
          </label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.currentTarget.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
            // fin período · period end
          </label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.currentTarget.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
            // notas · notes (opcional · optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            rows={2}
            style={{
              ...inputStyle,
              resize: 'vertical',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>
      </div>
      <div
        style={{
          padding: '0 18px 16px',
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        {generateMut.isError && (
          <span className="mono" style={{ color: 'var(--eg-red)', fontSize: 11 }}>
            // error · check input
          </span>
        )}
        <button
          className="b-btn b-btn--ink"
          onClick={() => generateMut.mutate()}
          disabled={generateMut.isPending}
        >
          {generateMut.isPending ? '...' : '+ Generar Anexo · Generate Annex'}
        </button>
      </div>
    </section>
  );
}

// ── Invoice list ─────────────────────────────────────────────────────────────

function InvoiceList({ clientId }: { clientId: string }) {
  const listQ = useQuery({
    queryKey: ['invoices', 'client', clientId],
    queryFn: () => invoices.listForClient(clientId),
    staleTime: 30_000,
  });

  if (listQ.isLoading) {
    return (
      <div className="gs-state" style={{ minHeight: 120 }}>
        <span className="gs-loading">cargando anexos · loading annexes</span>
      </div>
    );
  }

  if (listQ.isError) {
    return (
      <div className="gs-state" style={{ minHeight: 80 }}>
        <span className="mono" style={{ color: 'var(--eg-red)', fontSize: 11 }}>
          // error al cargar anexos · failed to load annexes
        </span>
      </div>
    );
  }

  const data = listQ.data ?? [];

  return (
    <section style={{ border: '2px solid var(--eg-iron)' }}>
      <div
        className="tag-head"
        style={{ background: 'var(--eg-yellow)', padding: '8px 14px' }}
      >
        <span>// ANEXOS DE FACTURACIÓN · BILLING ANNEXES · {data.length}</span>
        <span>IMPORTE CONGELADO EN EMISIÓN · RATE FROZEN AT GENERATION</span>
      </div>

      <div className="gs-tablewrap" style={{ ['--gs-tw-min' as string]: '900px' }}>
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '150px 165px minmax(160px, 1fr) 150px 150px 110px',
          gap: 0,
          background: 'var(--eg-paper-3)',
          borderBottom: '1.5px solid var(--eg-iron)',
          padding: '8px 14px',
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
        <span>// ticketbai</span>
        <span>// creada · created</span>
      </div>

      {data.length === 0 && (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--eg-fg-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          // sin anexos · no annexes yet
        </div>
      )}

      {data.map((inv, i) => (
        <Link
          key={inv.id}
          to={`/invoices/${inv.id}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '150px 165px minmax(160px, 1fr) 150px 150px 110px',
            gap: 0,
            alignItems: 'center',
            padding: '12px 14px',
            borderBottom: i < data.length - 1 ? '1px dashed var(--eg-rule)' : 'none',
            background: i % 2 ? 'var(--eg-paper)' : 'var(--eg-paper-2)',
            textDecoration: 'none',
            transition: 'background var(--dur-1)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'var(--eg-yellow-soft, var(--eg-paper-3))';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background =
              i % 2 ? 'var(--eg-paper)' : 'var(--eg-paper-2)';
          }}
        >
          <span>
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
          </span>
          <span>
            <InvoiceStatusBadge status={inv.status} />
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
              <span>todo el trabajo · all work</span>
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
              color: inv.externalInvoiceRef ? 'var(--eg-iron)' : 'var(--eg-fg-4)',
              letterSpacing: '0.04em',
            }}
          >
            {inv.externalInvoiceRef ?? '—'}
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
        </Link>
      ))}
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function BillingPage() {
  const me = useMe();
  const [selectedClientId, setSelectedClientId] = useState('');

  const clientsQ = useQuery({
    queryKey: ['clients'],
    queryFn: () => clients.list(),
    staleTime: 60_000,
  });

  const isViewer = me.data?.role === 'viewer';
  const selectedClient = (clientsQ.data ?? []).find((c) => c.id === selectedClientId);

  const selectStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    padding: '8px 12px',
    border: '2px solid var(--eg-iron)',
    background: 'var(--eg-paper)',
    color: 'var(--eg-iron)',
    minWidth: 260,
    cursor: 'pointer',
  };

  return (
    <div className="body">
      <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px', background: 'var(--eg-paper)' }}>
        {/* Page header */}
        <div
          className="summary-head"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 24,
            alignItems: 'end',
            borderBottom: '2px solid var(--eg-iron)',
            paddingBottom: 8,
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              className="disp"
              style={{
                fontSize: 44,
                lineHeight: 0.9,
                color: 'var(--eg-iron)',
                margin: 0,
                fontWeight: 900,
                letterSpacing: '-0.02em',
              }}
            >
              FACTURACIÓN
            </h1>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--eg-fg-3)',
                letterSpacing: '0.14em',
                marginTop: 4,
                textTransform: 'uppercase',
              }}
            >
              — ANEXOS DE FACTURACIÓN · BILLING ANNEXES —
            </div>
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--eg-fg-3)',
              letterSpacing: '0.12em',
              textAlign: 'right',
            }}
          >
            IMPORTES CONGELADOS EN GENERACIÓN · AMOUNTS FROZEN AT GENERATION
            <br />
            NUNCA SE RECOMPUTAN EN EL CLIENTE · NEVER RECOMPUTED CLIENT-SIDE
          </div>
        </div>

        {/* Client selector */}
        <div style={{ marginBottom: 24 }}>
          <div className="caps" style={{ color: 'var(--eg-fg-3)', marginBottom: 8 }}>
            // cliente · client
          </div>
          {clientsQ.isLoading ? (
            <div className="gs-loading">cargando clientes · loading clients</div>
          ) : clientsQ.isError ? (
            <span className="mono" style={{ color: 'var(--eg-red)', fontSize: 11 }}>
              // error al cargar clientes · failed to load
            </span>
          ) : (
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.currentTarget.value)}
              style={selectStyle}
            >
              <option value="">— seleccionar cliente · select client —</option>
              {(clientsQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.currency})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Content — only shown when a client is selected */}
        {selectedClientId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Generate form — hidden for viewers */}
            {!isViewer && (
              <GenerateForm
                clientId={selectedClientId}
                currency={selectedClient?.currency ?? 'EUR'}
              />
            )}
            {isViewer && (
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--eg-fg-3)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '10px 14px',
                  border: '1px dashed var(--eg-rule)',
                  background: 'var(--eg-paper-2)',
                }}
              >
                // sólo lectura · read-only — viewer role · rol observador
              </div>
            )}
            <InvoiceList clientId={selectedClientId} />
          </div>
        )}
      </div>
    </div>
  );
}
