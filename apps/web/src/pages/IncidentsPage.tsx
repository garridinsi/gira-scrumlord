// SPDX-License-Identifier: GPL-3.0-or-later
// Incidents dashboard — emergency paging, ack/resolve actions.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { IncidentView } from '@gira/shared';
import { incidents, ApiError } from '../api/client';
import { useMe } from '../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { Subbar } from '../ui/Subbar';
import { formatRelativeTime, formatDate } from '../lib/format';

// ── Status filter options ─────────────────────────────────────────────────────

type StatusFilter = 'open' | 'acked' | 'resolved' | 'all';

const FILTERS: { value: StatusFilter; es: string; en: string }[] = [
  { value: 'open', es: 'Abiertas', en: 'Open' },
  { value: 'acked', es: 'Reconocidas', en: 'Acked' },
  { value: 'resolved', es: 'Resueltas', en: 'Resolved' },
  { value: 'all', es: 'Todas', en: 'All' },
];

// ── Status badge ──────────────────────────────────────────────────────────────

function IncidentStatusBadge({ status }: { status: IncidentView['status'] }) {
  const cfg: Record<IncidentView['status'], { es: string; en: string; bg: string; color: string }> =
    {
      open: { es: 'Abierta', en: 'Open', bg: 'var(--eg-red)', color: 'var(--eg-paper)' },
      acked: { es: 'Reconocida', en: 'Acked', bg: 'var(--eg-yellow)', color: 'var(--eg-iron)' },
      resolved: {
        es: 'Resuelta',
        en: 'Resolved',
        bg: 'var(--eg-paper-3)',
        color: 'var(--eg-fg-3)',
      },
    };
  const c = cfg[status];
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        padding: '3px 8px',
        background: c.bg,
        color: c.color,
        border: '1.5px solid var(--eg-iron)',
        display: 'inline-block',
        whiteSpace: 'nowrap',
      }}
    >
      {c.es} · {c.en}
    </span>
  );
}

// ── Escalation indicator ──────────────────────────────────────────────────────

function EscalationBadge({ level }: { level: number }) {
  const color =
    level >= 3
      ? 'var(--eg-red)'
      : level === 2
        ? 'var(--eg-yellow)'
        : 'var(--eg-fg-4)';
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color,
        fontWeight: level >= 2 ? 700 : 400,
      }}
    >
      Nivel {level} · Level {level}
    </span>
  );
}

// ── Incident row ──────────────────────────────────────────────────────────────

function IncidentRow({
  inc,
  i,
  canWrite,
}: {
  inc: IncidentView;
  i: number;
  canWrite: boolean;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const ackMut = useMutation({
    mutationFn: () => incidents.ack(inc.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['incidents'] });
      toast({ tone: 'ok', title: 'Reconocida · Acknowledged', body: inc.issueKey });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al reconocer · Ack failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const resolveMut = useMutation({
    mutationFn: () => incidents.resolve(inc.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['incidents'] });
      toast({ tone: 'ok', title: 'Resuelta · Resolved', body: inc.issueKey });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al resolver · Resolve failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const isBusy = ackMut.isPending || resolveMut.isPending;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr 140px 130px 130px 110px 160px',
        gap: 0,
        padding: '10px 22px',
        borderBottom: '1px solid var(--eg-rule)',
        alignItems: 'center',
        background:
          inc.status === 'open'
            ? 'rgba(220,38,38,0.04)'
            : i % 2
              ? 'var(--eg-paper)'
              : 'var(--eg-paper-2)',
      }}
    >
      {/* Issue key */}
      <button
        type="button"
        onClick={() => navigate(`/issues/${inc.issueKey}`)}
        style={{
          background: 'none',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--eg-iron)',
            letterSpacing: '0.08em',
            textDecoration: 'underline',
            textDecorationColor: 'var(--eg-rule)',
          }}
        >
          {inc.issueKey}
        </span>
      </button>

      {/* Title */}
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--eg-iron)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {inc.title}
      </span>

      {/* Status */}
      <span>
        <IncidentStatusBadge status={inc.status} />
      </span>

      {/* Escalation */}
      <span>
        <EscalationBadge level={inc.escalationLevel} />
      </span>

      {/* Created */}
      <span
        className="mono"
        style={{ fontSize: 11, color: 'var(--eg-fg-4)' }}
        title={formatDate(inc.createdAt)}
      >
        {formatRelativeTime(inc.createdAt)}
      </span>

      {/* Last notified */}
      <span
        className="mono"
        style={{ fontSize: 11, color: 'var(--eg-fg-4)' }}
        title={inc.lastNotifiedAt ? formatDate(inc.lastNotifiedAt) : '—'}
      >
        {inc.lastNotifiedAt ? formatRelativeTime(inc.lastNotifiedAt) : '—'}
      </span>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {canWrite && inc.status === 'open' && (
          <button
            type="button"
            className="b-btn"
            onClick={() => ackMut.mutate()}
            disabled={isBusy}
            style={{ fontSize: 11, padding: '4px 8px' }}
          >
            {ackMut.isPending ? '...' : 'Reconocer · Ack'}
          </button>
        )}
        {canWrite && (inc.status === 'open' || inc.status === 'acked') && (
          <button
            type="button"
            className="b-btn b-btn--ink"
            onClick={() => resolveMut.mutate()}
            disabled={isBusy}
            style={{ fontSize: 11, padding: '4px 8px' }}
          >
            {resolveMut.isPending ? '...' : 'Resolver · Resolve'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function IncidentsPage() {
  const me = useMe();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');

  const canWrite = me.data?.role === 'admin' || me.data?.role === 'member';

  const queryArg = statusFilter === 'all' ? undefined : statusFilter;
  const incidentsQ = useQuery({
    queryKey: ['incidents', statusFilter],
    queryFn: () => incidents.list(queryArg),
    refetchInterval: 30_000,
  });

  const data: IncidentView[] = incidentsQ.data ?? [];
  const openCount = data.filter((i) => i.status === 'open').length;

  return (
    <div className="body">
      <Subbar
        tabs={FILTERS.map((f) => ({
          es: f.es,
          en: f.en,
          count: f.value === statusFilter ? data.length : null,
          active: statusFilter === f.value,
          onClick: () => setStatusFilter(f.value),
        }))}
        right={
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--eg-fg-5)',
              letterSpacing: '0.12em',
              padding: '0 8px',
            }}
          >
            // refresco 30s · 30s refresh
          </span>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', background: 'var(--eg-paper)' }}>
        {/* Page header */}
        <div
          style={{
            borderBottom: '2px solid var(--eg-iron)',
            padding: '16px 22px',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 24,
            alignItems: 'end',
            background: 'var(--eg-paper)',
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
              INCIDENCIAS · INCIDENTS
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
              — Paging de emergencias · Emergency paging —
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            {openCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: 'var(--eg-red)',
                    display: 'inline-block',
                    borderRadius: '50%',
                    animation: 'blink 1.4s steps(2) infinite',
                  }}
                />
                <span
                  className="disp"
                  style={{ fontSize: 28, color: 'var(--eg-red)', lineHeight: 1 }}
                >
                  {openCount} ABIERTAS
                </span>
              </div>
            )}
            {openCount === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: 'var(--eg-green)',
                    display: 'inline-block',
                    borderRadius: '50%',
                  }}
                />
                <span
                  className="disp"
                  style={{ fontSize: 28, color: 'var(--eg-green)', lineHeight: 1 }}
                >
                  OK
                </span>
              </div>
            )}
            <div
              className="mono"
              style={{ fontSize: 10, color: 'var(--eg-fg-4)', letterSpacing: '0.1em', marginTop: 4 }}
            >
              {data.length} TOTAL · {statusFilter.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Status filter pills */}
        <div
          style={{
            background: 'var(--eg-paper-2)',
            borderBottom: '1px solid var(--eg-rule)',
            padding: '8px 22px',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <span className="caps" style={{ color: 'var(--eg-fg-4)', marginRight: 8 }}>
            // estado · status ·
          </span>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              style={{
                padding: '3px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                background: statusFilter === f.value ? 'var(--eg-iron)' : 'transparent',
                color: statusFilter === f.value ? 'var(--eg-paper)' : 'var(--eg-iron)',
                border: `1.5px solid ${statusFilter === f.value ? 'var(--eg-iron)' : 'var(--eg-rule)'}`,
                fontWeight: statusFilter === f.value ? 700 : 400,
              }}
            >
              {f.es} · {f.en}
            </button>
          ))}
        </div>

        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '110px 1fr 140px 130px 130px 110px 160px',
            gap: 0,
            padding: '6px 22px',
            background: 'var(--eg-paper-3)',
            borderBottom: '1px solid var(--eg-rule)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--eg-fg-4)',
          }}
        >
          <span>// issue</span>
          <span>// título · title</span>
          <span>// estado · status</span>
          <span>// nivel · level</span>
          <span>// creada · created</span>
          <span>// último aviso</span>
          <span style={{ textAlign: 'right' }}>// acciones · actions</span>
        </div>

        {/* Loading */}
        {incidentsQ.isLoading && (
          <div className="gs-state">
            <span className="gs-loading">cargando incidencias · loading incidents</span>
          </div>
        )}

        {/* Error */}
        {incidentsQ.isError && (
          <div className="gs-state">
            <span
              className="mono"
              style={{ color: 'var(--eg-red)', fontSize: 12, letterSpacing: '0.12em' }}
            >
              // error al cargar incidencias · failed to load
            </span>
          </div>
        )}

        {/* Empty */}
        {!incidentsQ.isLoading && !incidentsQ.isError && data.length === 0 && (
          <div className="gs-state" style={{ flexDirection: 'column', gap: 10 }}>
            <div
              className="disp"
              style={{ fontSize: 32, color: 'var(--eg-fg-4)', fontWeight: 900 }}
            >
              ✓
            </div>
            <div
              className="mono"
              style={{
                color: 'var(--eg-fg-4)',
                fontSize: 12,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              // sin incidencias · no incidents
            </div>
          </div>
        )}

        {/* Rows */}
        {data.map((inc, i) => (
          <IncidentRow key={inc.id} inc={inc} i={i} canWrite={canWrite} />
        ))}
      </div>
    </div>
  );
}
