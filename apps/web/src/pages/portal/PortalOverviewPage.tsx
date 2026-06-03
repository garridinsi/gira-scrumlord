// SPDX-License-Identifier: GPL-3.0-or-later
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portal } from '../../api/client';
import { formatMinutes } from '../../lib/format';
import { formatMoney } from '../../lib/money';
import type { PortalProjectRollup } from '@gira/shared';

export function PortalOverviewPage() {
  const navigate = useNavigate();
  const overviewQ = useQuery({
    queryKey: ['portal', 'overview'],
    queryFn: () => portal.overview(),
    staleTime: 60_000,
  });

  if (overviewQ.isLoading) {
    return (
      <div className="gs-state">
        <span className="gs-loading">cargando resumen · loading overview</span>
      </div>
    );
  }

  if (overviewQ.isError || !overviewQ.data) {
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
            Error al cargar · Load error
          </div>
          <p style={{ margin: 0 }}>
            {overviewQ.error instanceof Error
              ? overviewQ.error.message
              : 'No se pudo cargar el resumen · Could not load overview'}
          </p>
        </div>
      </div>
    );
  }

  const { totals, projects, client } = overviewQ.data;
  const currency = totals.currency || client?.currency || 'EUR';
  const clientName = client?.name ?? '';

  return (
    <div>
      {/* ── Poster header ─────────────────────────────────── */}
      <div className="cp-poster">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="cp-poster__eyebrow">Portal de cliente · Client portal</div>
          <h1 className="cp-poster__title">{clientName || 'Portal'}</h1>
          <p className="cp-poster__sub">Resumen de proyectos · Project overview</p>
        </div>
      </div>

      <div className="cp-page">
        {/* ── Stat tiles ────────────────────────────────── */}
        <div className="cp-stats">
          <div className="cp-stat">
            <span className="cp-stat__label">Abierto</span>
            <span className="cp-stat__label-en">Open</span>
            <span className="cp-stat__val">{totals.open}</span>
          </div>

          <div className="cp-stat cp-stat--accent">
            <span className="cp-stat__label">En curso</span>
            <span className="cp-stat__label-en">In progress</span>
            <span className="cp-stat__val">{totals.inProgress}</span>
          </div>

          <div className="cp-stat">
            <span className="cp-stat__label">Hecho</span>
            <span className="cp-stat__label-en">Done</span>
            <span className="cp-stat__val">{totals.done}</span>
          </div>

          <div className="cp-stat">
            <span className="cp-stat__label">Tiempo</span>
            <span className="cp-stat__label-en">Time</span>
            <span className="cp-stat__val cp-stat__val--time">
              {formatMinutes(totals.totalMinutes)}
            </span>
          </div>

          <div className="cp-stat">
            <span className="cp-stat__label">Devengado</span>
            <span className="cp-stat__label-en">Accrued</span>
            <span className="cp-stat__val cp-stat__val--money">
              {formatMoney(totals.accruedCents, currency)}
            </span>
          </div>
        </div>

        {/* ── CTA ───────────────────────────────────────── */}
        <div style={{ marginBottom: 40, display: 'flex', gap: 12 }}>
          <button
            type="button"
            className="b-btn b-btn--yellow"
            onClick={() => navigate('/portal/request')}
            style={{ fontSize: 14, padding: '10px 22px' }}
          >
            + Nueva solicitud · New request
          </button>
          <button
            type="button"
            className="b-btn"
            onClick={() => navigate('/portal/issues')}
            style={{ fontSize: 14, padding: '10px 22px' }}
          >
            Ver tickets · View issues
          </button>
        </div>

        {/* ── Projects ─────────────────────────────────── */}
        {projects.length > 0 && (
          <div className="cp-projects">
            <div className="cp-projects__head">
              Proyectos · Projects{' '}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  background: 'var(--eg-iron)',
                  color: 'var(--eg-yellow)',
                  padding: '1px 7px',
                }}
              >
                {projects.length}
              </span>
            </div>

            <div className="cp-project-grid">
              {projects.map((p) => (
                <ProjectRollupCard key={p.key} project={p} currency={currency} />
              ))}
            </div>
          </div>
        )}

        {projects.length === 0 && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--eg-fg-4)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              padding: '40px 0',
              textAlign: 'center',
            }}
          >
            Sin proyectos asignados · No projects assigned
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectRollupCard({
  project,
  currency,
}: {
  project: PortalProjectRollup;
  currency: string;
}) {
  return (
    <article className="cp-proj-card">
      <div className="cp-proj-card__head">
        <span className="cp-proj-card__key">{project.key}</span>
        <span>{project.open + project.inProgress + project.done} tickets</span>
      </div>
      <div className="cp-proj-card__body">
        <div className="cp-proj-card__name">{project.name}</div>

        <div className="cp-proj-card__counters">
          <span className="cp-proj-card__counter cp-proj-card__counter--open">
            {project.open} abierto
          </span>
          {project.inProgress > 0 && (
            <span className="cp-proj-card__counter cp-proj-card__counter--progress">
              {project.inProgress} en curso
            </span>
          )}
          {project.done > 0 && (
            <span className="cp-proj-card__counter cp-proj-card__counter--done">
              {project.done} hecho
            </span>
          )}
        </div>

        <div className="cp-proj-card__meta">
          <span>{formatMinutes(project.totalMinutes)}</span>
          <span className="cp-proj-card__accrued">
            {formatMoney(project.accruedCents, currency)}
          </span>
        </div>
      </div>
    </article>
  );
}
