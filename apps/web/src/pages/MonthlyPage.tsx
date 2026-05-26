// SPDX-License-Identifier: GPL-3.0-or-later
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MonthlyRollupView } from '@gira/shared';
import { invoices, projects, ApiError } from '../api/client';
import { Plate } from '../ui/atoms';
import { Subbar } from '../ui/Subbar';
import { useToast } from '../ui/Toast';
import { useMe } from '../hooks/useAuth';
import { useProjectTabs } from '../hooks/useProjectTabs';
import { formatMinutes } from '../lib/format';
import { formatMoney } from '../lib/money';

// ── Month label: 'YYYY-MM' → 'MAYO 2026' ─────────────────────────────────────
const MONTH_NAMES_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
] as const;

function formatMonthLabel(ym: string): string {
  const [yearStr, monthStr] = ym.split('-');
  const year = parseInt(yearStr ?? '0', 10);
  const month = parseInt(monthStr ?? '1', 10);
  const name = MONTH_NAMES_ES[(month - 1) % 12] ?? '';
  return `${name} ${year}`;
}

/** Last day of the given YYYY-MM string, e.g. '2026-05' → '2026-05-31' */
function lastDayOf(ym: string): string {
  const [yearStr, monthStr] = ym.split('-');
  const year = parseInt(yearStr ?? '0', 10);
  const month = parseInt(monthStr ?? '1', 10); // 1-based
  // new Date(year, month, 0) = last day of month (month is 0-based, so month+1-1 = month)
  const last = new Date(year, month, 0).getDate();
  return `${ym}-${String(last).padStart(2, '0')}`;
}

// ── Single month row ──────────────────────────────────────────────────────────
function MonthRow({
  row,
  currency,
  clientId,
  canInvoice,
  odd,
}: {
  row: MonthlyRollupView;
  currency: string;
  clientId: string | null | undefined;
  canInvoice: boolean;
  odd: boolean;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const invoiceMut = useMutation({
    mutationFn: () => {
      if (!clientId) throw new Error('sin cliente · no client');
      const periodStart = `${row.month}-01`;
      const periodEnd = lastDayOf(row.month);
      const notes = `Mantenimiento ${row.month}`;
      return invoices.generate(clientId, { periodStart, periodEnd, notes });
    },
    onSuccess: (inv) => {
      void qc.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        tone: 'ok',
        title: 'Factura generada · Invoice generated',
        body: `${inv.number} · ${row.month}`,
      });
      navigate(`/invoices/${inv.id}`);
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al facturar · Invoice failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const showBillable = row.billableMinutes !== row.totalMinutes;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '200px 160px 160px 1fr',
        gap: 18,
        alignItems: 'center',
        padding: '14px 18px',
        borderBottom: '1px solid var(--eg-iron)',
        background: odd ? 'var(--eg-paper-2)' : 'var(--eg-paper)',
      }}
    >
      {/* Month label */}
      <div>
        <span
          className="disp"
          style={{ fontSize: 16, color: 'var(--eg-iron)', fontWeight: 800, letterSpacing: '-0.01em' }}
        >
          {formatMonthLabel(row.month)}
        </span>
        <div className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-4)', letterSpacing: '0.12em', marginTop: 2 }}>
          {row.month}
        </div>
      </div>

      {/* Time */}
      <div>
        <span
          className="mono"
          style={{ fontSize: 14, fontWeight: 700, color: 'var(--eg-iron)' }}
        >
          {formatMinutes(row.billableMinutes)}
        </span>
        {showBillable && (
          <div className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', marginTop: 2 }}>
            {formatMinutes(row.totalMinutes)} total
          </div>
        )}
      </div>

      {/* Cost */}
      <div>
        <span
          className="mono"
          style={{ fontSize: 14, fontWeight: 700, color: 'var(--eg-iron)' }}
        >
          {formatMoney(row.accruedCents, currency)}
        </span>
      </div>

      {/* Invoice action */}
      <div style={{ textAlign: 'right' }}>
        {canInvoice && clientId ? (
          <button
            className="b-btn b-btn--ink"
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => invoiceMut.mutate()}
            disabled={invoiceMut.isPending}
          >
            {invoiceMut.isPending ? '...' : 'Facturar mes · Invoice month'}
          </button>
        ) : !clientId ? (
          <span
            className="mono"
            style={{ fontSize: 10, color: 'var(--eg-fg-4)', letterSpacing: '0.1em', fontStyle: 'italic' }}
          >
            asigna un cliente para facturar · assign a client to invoice
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function MonthlyPage() {
  const { key = '' } = useParams<{ key: string }>();
  const tabs = useProjectTabs(key, 'monthly');
  const me = useMe();

  const projectQ = useQuery({
    queryKey: ['project', key],
    queryFn: () => projects.get(key),
    enabled: !!key,
  });

  const monthlyQ = useQuery({
    queryKey: ['monthly', key],
    queryFn: () => projects.monthly(key),
    enabled: !!key,
  });

  if (monthlyQ.isLoading || projectQ.isLoading) {
    return (
      <div className="body">
        <Subbar tabs={tabs} />
        <div className="gs-state">
          <span className="gs-loading">cargando datos mensuales · loading monthly data</span>
        </div>
      </div>
    );
  }

  if (monthlyQ.isError) {
    return (
      <div className="body">
        <Subbar tabs={tabs} />
        <div className="gs-state">
          <div>
            <Plate>ERROR</Plate>
            <div className="mono" style={{ fontSize: 12, color: 'var(--eg-red)', marginTop: 8 }}>
              {(monthlyQ.error as Error).message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const data = monthlyQ.data!;
  const project = projectQ.data;
  const clientId = project?.clientId ?? null;
  const canInvoice = me.data?.role === 'admin' || me.data?.role === 'member';

  return (
    <div className="body">
      <Subbar tabs={tabs} />

      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Section header */}
        <div
          style={{
            background: 'var(--eg-iron)',
            color: 'var(--eg-paper)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            borderBottom: '2px solid var(--eg-iron)',
          }}
        >
          <Plate tone="yellow">MENSUAL · MONTHLY</Plate>
          <span className="disp" style={{ fontSize: 20, color: 'var(--eg-paper)' }}>
            {key} · Mantenimiento Mensual
          </span>
          <span
            className="mono"
            style={{ fontSize: 10, color: 'var(--eg-fg-5)', letterSpacing: '0.12em', marginLeft: 8 }}
          >
            TIEMPO Y COSTE POR MES · TIME &amp; COST PER MONTH · {data.months.length} MESES · {data.currency}
          </span>
        </div>

        {/* Column headings */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 160px 160px 1fr',
            gap: 18,
            padding: '6px 18px',
            background: 'var(--eg-paper-3)',
            borderBottom: '1px solid var(--eg-iron)',
          }}
        >
          {['MES · MONTH', 'TIEMPO FACTURABLE · BILLABLE TIME', 'COSTE · COST', 'ACCIÓN · ACTION'].map((h) => (
            <span key={h} className="caps">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {data.months.length === 0 ? (
          <div className="gs-state">
            <div>
              <Plate tone="yellow">SIN REGISTROS</Plate>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--eg-fg-3)',
                  letterSpacing: '0.14em',
                  marginTop: 12,
                  textTransform: 'uppercase',
                }}
              >
                sin tiempo registrado todavía · no time logged yet
              </div>
            </div>
          </div>
        ) : (
          data.months.map((row, i) => (
            <MonthRow
              key={row.month}
              row={row}
              currency={data.currency}
              clientId={clientId}
              canInvoice={canInvoice}
              odd={i % 2 === 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
