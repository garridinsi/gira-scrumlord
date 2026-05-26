// SPDX-License-Identifier: GPL-3.0-or-later
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProjectSummaryView } from '@gira/shared';
import { projects, ApiError } from '../api/client';
import type { SprintRecord } from '../api/client';
import { Plate, SpinGlyph } from '../ui/atoms';
import { Subbar } from '../ui/Subbar';
import { formatMinutes } from '../lib/format';
import { formatMoney } from '../lib/money';
import { useProjectTabs } from '../hooks/useProjectTabs';
import { useToast } from '../ui/Toast';

// ── Big stat tile (the 4 top-row tiles) ──────────────────────────────────────
function BigStat({
  labelEs,
  labelEn,
  value,
  unit,
  prefix,
  sub,
  color,
  children,
}: {
  labelEs: React.ReactNode;
  labelEn: string;
  value: string;
  unit?: string;
  prefix?: string;
  sub: string;
  color: 'paper' | 'paper-2' | 'yellow' | 'ink';
  children?: React.ReactNode;
}) {
  const bgMap: Record<string, string> = {
    paper: 'var(--eg-paper)',
    'paper-2': 'var(--eg-paper-2)',
    yellow: 'var(--eg-yellow)',
    ink: 'var(--eg-iron)',
  };
  const bg = bgMap[color] ?? 'var(--eg-paper)';
  const fg = color === 'ink' ? 'var(--eg-yellow)' : 'var(--eg-iron)';
  const subColor = color === 'ink' ? 'var(--eg-fg-5)' : 'var(--eg-fg-3)';

  return (
    <div
      style={{
        padding: '16px 18px 14px',
        background: bg,
        color: fg,
        borderRight: '1.5px solid var(--eg-iron)',
        position: 'relative',
      }}
    >
      <div className="caps" style={{ color: subColor }}>
        // {labelEs} · {labelEn}
      </div>
      <div
        className="disp"
        style={{
          fontSize: 52,
          lineHeight: 1,
          marginTop: 6,
          fontWeight: 900,
          letterSpacing: '-0.02em',
        }}
      >
        {prefix && (
          <span style={{ fontSize: 20, marginRight: 4, color: subColor }}>{prefix}</span>
        )}
        {children ?? value}
        {unit && (
          <span
            style={{
              fontSize: 16,
              marginLeft: 6,
              color: subColor,
              textTransform: 'uppercase',
            }}
          >
            {unit}
          </span>
        )}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10.5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: subColor,
          marginTop: 6,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

// ── Velocity bar chart built from real sprint data ────────────────────────────
function VelocityChart({ sprintsData }: { sprintsData: SprintRecord[] }) {
  // Only sprints with any points data
  const data = sprintsData.filter(
    (s) => (s.committedPoints ?? 0) > 0 || s.state === 'closed',
  );

  if (data.length === 0) {
    return (
      <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)' }}>
        <div
          className="tag-head"
          style={{
            background: 'var(--eg-iron)',
            color: 'var(--eg-yellow)',
            borderColor: 'var(--eg-iron)',
            padding: '8px 14px',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SpinGlyph /> VELOCIDAD · VELOCITY · HISTÓRICO
          </span>
          <span>COMPROMETIDO / COMPLETADO · PUNTOS</span>
        </div>
        <div className="gs-state" style={{ minHeight: 160 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--eg-fg-4)', letterSpacing: '0.1em' }}>
            SIN DATOS · NO SPRINT DATA YET
          </span>
        </div>
      </section>
    );
  }

  // Show up to 8 most recent sprints
  const recent = data.slice(-8);

  // Max committed for Y-axis scaling
  const maxCommitted = Math.max(...recent.map((d) => d.committedPoints ?? 0), 14);
  // Round up to nearest 7 for clean axis
  const axisMax = Math.ceil(maxCommitted / 7) * 7;
  const axisTicks = [0, axisMax / 4, axisMax / 2, (axisMax * 3) / 4, axisMax].map((v) =>
    Math.round(v),
  );

  const w = 480;
  const h = 200;
  const pad = 30;
  const bw = (w - pad * 2) / recent.length;
  const barW = bw * 0.36;

  // Avg velocity from closed sprints
  const closedWithData = recent.filter(
    (s) => s.state === 'closed' && (s.committedPoints ?? 0) > 0,
  );
  const avgVelocity =
    closedWithData.length > 0
      ? Math.round(
          (closedWithData.reduce((a, s) => a + (s.committedPoints ?? 0), 0) /
            closedWithData.length) *
            10,
        ) / 10
      : null;

  return (
    <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)' }}>
      <div
        className="tag-head"
        style={{
          background: 'var(--eg-iron)',
          color: 'var(--eg-yellow)',
          borderColor: 'var(--eg-iron)',
          padding: '8px 14px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SpinGlyph /> VELOCIDAD · VELOCITY · ÚLTIMOS {recent.length} SPRINTS
        </span>
        <span>COMPROMETIDO / COMPLETADO · PUNTOS</span>
      </div>
      <div style={{ padding: '16px 14px 8px' }}>
        <svg
          width="100%"
          viewBox={`0 0 ${w} ${h + 44}`}
          style={{ display: 'block' }}
          aria-label="Velocity chart"
        >
          <defs>
            <pattern
              id="vel-hatch"
              patternUnits="userSpaceOnUse"
              width="6"
              height="6"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--eg-rule, var(--eg-paper-3))" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* Gridlines */}
          {axisTicks.map((v) => (
            <g key={v}>
              <line
                x1={pad}
                x2={w - pad}
                y1={h - (v / axisMax) * h + 8}
                y2={h - (v / axisMax) * h + 8}
                stroke="var(--eg-rule, var(--eg-paper-3))"
                strokeDasharray="2 4"
              />
              <text
                x={pad - 8}
                y={h - (v / axisMax) * h + 12}
                textAnchor="end"
                fontFamily="var(--font-mono)"
                fontSize="10"
                fill="var(--eg-fg-3)"
              >
                {v}
              </text>
            </g>
          ))}

          {/* Bars */}
          {recent.map((d, i) => {
            const committed = d.committedPoints ?? 0;
            const completed = 0; // SprintRecord doesn't carry completedPoints — only committedPoints
            const cx = pad + i * bw + bw / 2;
            const ch = axisMax > 0 ? (committed / axisMax) * h : 0;
            const dh = axisMax > 0 ? (completed / axisMax) * h : 0;
            const isPartial = d.state === 'active';

            const fillColor =
              d.state === 'future'
                ? 'var(--eg-paper-3)'
                : completed >= committed
                  ? 'var(--eg-green)'
                  : completed / committed < 0.85
                    ? 'var(--eg-red)'
                    : 'var(--eg-yellow)';

            return (
              <g key={d.id}>
                {/* Committed — hatched outline */}
                {ch > 0 && (
                  <>
                    <rect
                      x={cx - barW}
                      y={h - ch + 8}
                      width={barW * 2}
                      height={ch}
                      fill="none"
                      stroke="var(--eg-iron)"
                      strokeWidth="1.5"
                    />
                    <rect
                      x={cx - barW + 1}
                      y={h - ch + 9}
                      width={barW * 2 - 2}
                      height={ch - 2}
                      fill="url(#vel-hatch)"
                    />
                  </>
                )}

                {/* Completed — solid fill (if available) */}
                {dh > 0 && (
                  <rect
                    x={cx - barW * 0.65}
                    y={h - dh + 8}
                    width={barW * 1.3}
                    height={dh}
                    fill={fillColor}
                    stroke="var(--eg-iron)"
                    strokeWidth="1.5"
                  />
                )}

                {/* Sprint label */}
                <text
                  x={cx}
                  y={h + 22}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize="10"
                  fill="var(--eg-fg-3)"
                  letterSpacing="0.08em"
                >
                  {d.name.length > 8 ? d.name.slice(0, 8) : d.name}
                </text>

                {/* Committed points label */}
                {committed > 0 && (
                  <text
                    x={cx}
                    y={h - ch + 4}
                    textAnchor="middle"
                    fontFamily="var(--font-display)"
                    fontWeight="800"
                    fontSize="12"
                    fill="var(--eg-iron)"
                  >
                    {committed}
                  </text>
                )}

                {/* "EN CURSO" tag for active sprint */}
                {isPartial && (
                  <text
                    x={cx}
                    y={h + 36}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                    fill="var(--eg-fg-3)"
                    letterSpacing="0.08em"
                  >
                    EN CURSO
                  </text>
                )}
              </g>
            );
          })}

          {/* X axis */}
          <line
            x1={pad}
            x2={w - pad}
            y1={h + 8}
            y2={h + 8}
            stroke="var(--eg-iron)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            gap: 18,
            padding: '8px 14px 4px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--eg-fg-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                border: '1.5px solid var(--eg-iron)',
                verticalAlign: 'middle',
                marginRight: 4,
              }}
            />
            Comprometido
          </span>
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                background: 'var(--eg-green)',
                border: '1.5px solid var(--eg-iron)',
                verticalAlign: 'middle',
                marginRight: 4,
              }}
            />
            Completado
          </span>
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                background: 'var(--eg-red)',
                border: '1.5px solid var(--eg-iron)',
                verticalAlign: 'middle',
                marginRight: 4,
              }}
            />
            Por debajo
          </span>
          {avgVelocity != null && (
            <span style={{ marginLeft: 'auto', color: 'var(--eg-iron)', fontWeight: 700 }}>
              MEDIA · {avgVelocity} pts/sprint
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Sprint velocity table ─────────────────────────────────────────────────────
function SprintVelocityTable({ sprintsData }: { sprintsData: SprintRecord[] }) {
  const rows = [...sprintsData].reverse().slice(0, 8);

  if (rows.length === 0) return null;

  return (
    <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)' }}>
      <div
        className="tag-head"
        style={{ background: 'var(--eg-paper-2)', padding: '8px 14px' }}
      >
        <span>// SPRINTS · HISTORIAL</span>
        <span>{sprintsData.length} SPRINTS</span>
      </div>
      <div>
        {rows.map((s, i) => {
          const isActive = s.state === 'active';
          const isClosed = s.state === 'closed';
          return (
            <div
              key={s.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr auto auto',
                gap: 12,
                alignItems: 'center',
                padding: '10px 14px',
                borderBottom: i < rows.length - 1 ? '1px dashed var(--eg-rule, var(--eg-paper-3))' : 'none',
                background: isActive ? 'var(--eg-yellow)' : 'transparent',
                fontSize: 13,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--eg-iron)' : isClosed ? 'var(--eg-fg-3)' : 'var(--eg-fg-3)',
                }}
              >
                {s.state === 'active' ? 'ACTIVO' : s.state === 'future' ? 'FUTURO' : 'CERRADO'}
              </span>
              <span style={{ color: 'var(--eg-iron)', fontWeight: 500 }}>{s.name}</span>
              <span
                className="mono"
                style={{ fontSize: 11, color: 'var(--eg-fg-3)' }}
              >
                {s.startDate && s.endDate
                  ? `${new Date(s.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} → ${new Date(s.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`
                  : '—'}
              </span>
              <span
                className="disp"
                style={{ fontSize: 18, color: 'var(--eg-iron)', minWidth: 64, textAlign: 'right' }}
              >
                {s.committedPoints != null ? s.committedPoints : '—'}
                {s.committedPoints != null && (
                  <span style={{ fontSize: 11, color: 'var(--eg-fg-3)', marginLeft: 3 }}>pts</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Active sprint velocity details ────────────────────────────────────────────
function ActiveSprintPanel({
  summary,
}: {
  summary: ProjectSummaryView;
}) {
  const { activeSprint } = summary;
  if (!activeSprint) return null;

  const { velocity } = activeSprint;
  const pct =
    velocity.committedPoints > 0
      ? Math.round((velocity.completedPoints / velocity.committedPoints) * 100)
      : 0;

  return (
    <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)' }}>
      <div
        className="tag-head"
        style={{
          background: 'var(--eg-yellow)',
          padding: '8px 14px',
          borderColor: 'var(--eg-iron)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SpinGlyph /> // SPRINT ACTIVO · ACTIVE SPRINT
        </span>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.08em' }}>
          {activeSprint.name}
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 0,
          borderBottom: '1px solid var(--eg-iron)',
        }}
      >
        {[
          {
            labelEs: 'comprometido',
            labelEn: 'committed',
            value: velocity.committedPoints,
            unit: 'pts',
          },
          {
            labelEs: 'completado',
            labelEn: 'done',
            value: velocity.completedPoints,
            unit: 'pts',
          },
          {
            labelEs: 'avance',
            labelEn: 'progress',
            value: `${pct}%`,
            unit: '',
          },
        ].map(({ labelEs, labelEn, value, unit }) => (
          <div
            key={labelEs}
            style={{ padding: '14px 16px', borderRight: '1px solid var(--eg-iron)' }}
          >
            <div className="caps">
              // {labelEs} · {labelEn}
            </div>
            <div
              className="disp"
              style={{ fontSize: 32, color: 'var(--eg-iron)', lineHeight: 1, marginTop: 4 }}
            >
              {value}
              {unit && (
                <span style={{ fontSize: 12, marginLeft: 4, color: 'var(--eg-fg-3)' }}>{unit}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Progress bar */}
      <div
        style={{
          height: 8,
          background: 'var(--eg-paper-3)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct}%`,
            background:
              pct >= 100 ? 'var(--eg-green)' : pct < 85 ? 'var(--eg-yellow)' : 'var(--eg-green)',
            transition: 'width 400ms',
          }}
        />
      </div>
    </section>
  );
}

// ── Cadence toggle strip ───────────────────────────────────────────────────────
function CadenceStrip({ projectKey }: { projectKey: string }) {
  const qc = useQueryClient();
  const toast = useToast();

  const projectQ = useQuery({
    queryKey: ['project', projectKey],
    queryFn: () => projects.get(projectKey),
    enabled: !!projectKey,
    staleTime: 60_000,
  });

  const updateMut = useMutation({
    mutationFn: (cadence: 'sprints' | 'monthly') =>
      projects.update(projectKey, { cadence }),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['project', projectKey] });
      const label = p.cadence === 'monthly' ? 'Mensual · Monthly' : 'Sprints';
      toast({ tone: 'ok', title: 'Cadencia actualizada · Cadence updated', body: label });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al cambiar cadencia · Cadence update failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  if (!projectQ.data) return null;
  const current = projectQ.data.cadence ?? 'sprints';

  return (
    <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)', marginBottom: 18 }}>
      <div className="tag-head" style={{ background: 'var(--eg-paper-2)', padding: '8px 14px' }}>
        <span>// CADENCIA · CADENCE</span>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
          SPRINTS / MENSUAL · MONTHLY
        </span>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--eg-fg-3)', letterSpacing: '0.08em' }}>
          Modo de seguimiento del proyecto · Project tracking cadence
        </span>
        <div style={{ display: 'flex', gap: 0, border: '1.5px solid var(--eg-iron)', marginLeft: 'auto' }}>
          {(['sprints', 'monthly'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { if (current !== c) updateMut.mutate(c); }}
              disabled={updateMut.isPending}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '6px 14px',
                border: 'none',
                borderRight: c === 'sprints' ? '1.5px solid var(--eg-iron)' : 'none',
                cursor: current === c ? 'default' : 'pointer',
                background: current === c ? 'var(--eg-iron)' : 'var(--eg-paper)',
                color: current === c ? 'var(--eg-yellow)' : 'var(--eg-iron)',
                opacity: updateMut.isPending ? 0.6 : 1,
              }}
            >
              {c === 'sprints' ? 'Sprints' : 'Mensual · Monthly'}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ProjectSummaryPage() {
  const { key = '' } = useParams<{ key: string }>();

  const summaryQ = useQuery({
    queryKey: ['summary', key],
    queryFn: () => projects.summary(key),
    enabled: !!key,
  });

  const sprintsQ = useQuery({
    queryKey: ['sprints', key],
    queryFn: () => projects.sprints.list(key),
    enabled: !!key,
  });

  const tabs = useProjectTabs(key, 'summary');

  if (summaryQ.isLoading || sprintsQ.isLoading) {
    return (
      <div className="body">
        <Subbar tabs={tabs} />
        <div className="gs-state">
          <span className="gs-loading">cargando resumen · loading summary</span>
        </div>
      </div>
    );
  }

  if (summaryQ.isError) {
    return (
      <div className="body">
        <Subbar tabs={tabs} />
        <div className="gs-state">
          <div>
            <Plate>ERROR</Plate>
            <div className="mono" style={{ fontSize: 12, color: 'var(--eg-red)', marginTop: 8 }}>
              {(summaryQ.error as Error).message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const summary = summaryQ.data!;
  const sprintsList = sprintsQ.data ?? [];

  // Derived display values
  const totalH = Math.round((summary.totalMinutes / 60) * 10) / 10;
  const billableH = Math.round((summary.billableMinutes / 60) * 10) / 10;
  const billablePct =
    summary.totalMinutes > 0
      ? Math.round((summary.billableMinutes / summary.totalMinutes) * 100)
      : 0;

  const velocity = summary.activeSprint?.velocity;
  const avgVelocity =
    velocity != null
      ? velocity.committedPoints
      : null;

  // Money split into integer + decimal parts for display
  const moneyStr = formatMoney(summary.accruedCents, summary.currency);
  // moneyStr is like "EUR 28.405,00" — split currency prefix from amount
  const [moneyCurrency, moneyAmount] = moneyStr.split(' ') as [string, string];
  // Split integer part from decimal cents
  const moneyParts = moneyAmount?.split(',') ?? ['0', '00'];
  const moneyInt = moneyParts[0] ?? '0';
  const moneyDec = `,${moneyParts[1] ?? '00'}`;

  return (
    <div className="body">
      <Subbar
        tabs={tabs}
        right={
          <>
            <span className="f-pill">
              MONEDA <b>{summary.currency}</b>
            </span>
          </>
        }
      />

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '18px 22px',
          background: 'var(--eg-paper)',
        }}
      >
        {/* Section title */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            gap: 24,
            alignItems: 'end',
            borderBottom: '2px solid var(--eg-iron)',
            paddingBottom: 8,
            marginBottom: 14,
          }}
        >
          <div>
            <h1
              className="disp"
              style={{
                fontSize: 48,
                lineHeight: 0.9,
                color: 'var(--eg-iron)',
                margin: 0,
                fontWeight: 900,
                letterSpacing: '-0.02em',
              }}
            >
              {key} · Resumen del Proyecto
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
              — PROJECT SUMMARY —
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
            PROYECTO · {key}
            <br />
            MONEDA · {summary.currency} · EN VIVO
          </div>
          <Plate tone="yellow">M1 · CORE</Plate>
        </div>

        {/* 4 stat tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            border: '2px solid var(--eg-iron)',
            background: 'var(--eg-paper)',
            marginBottom: 18,
          }}
        >
          <BigStat
            labelEs="tickets abiertos"
            labelEn="open issues"
            value={String(summary.openIssues)}
            sub={`${summary.doneIssues} cerrados · done`}
            color="paper"
          />
          <BigStat
            labelEs="tiempo registrado"
            labelEn="time logged"
            value={String(totalH)}
            unit="h"
            sub={`${billableH}h facturable · ${billablePct}%`}
            color="paper-2"
          />
          <BigStat
            labelEs="devengado · en vivo"
            labelEn="accrued · live"
            value={moneyInt}
            prefix={`${moneyCurrency} `}
            sub={`total acumulado · ${summary.currency}`}
            color="yellow"
          >
            {moneyInt}
            <span style={{ fontSize: 22, color: 'var(--eg-fg-3)' }}>{moneyDec}</span>
          </BigStat>
          <BigStat
            labelEs={
              <>
                <SpinGlyph /> velocidad
              </>
            }
            labelEn="velocity"
            value={avgVelocity != null ? String(avgVelocity) : '—'}
            unit={avgVelocity != null ? 'pts' : undefined}
            sub={
              summary.activeSprint
                ? `sprint activo · ${summary.activeSprint.name}`
                : 'sin sprint activo'
            }
            color="ink"
          />
        </div>

        {/* Active sprint panel + velocity chart */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: summary.activeSprint ? '1fr 1.4fr' : '1fr',
            gap: 16,
            marginBottom: 18,
          }}
        >
          {summary.activeSprint && <ActiveSprintPanel summary={summary} />}
          <VelocityChart sprintsData={sprintsList} />
        </div>

        {/* Sprint history table */}
        {sprintsList.length > 0 && <SprintVelocityTable sprintsData={sprintsList} />}

        {/* Cadence toggle */}
        <CadenceStrip projectKey={key} />

        {/* Empty state if no sprints at all */}
        {sprintsList.length === 0 && summary.openIssues === 0 && summary.doneIssues === 0 && (
          <div className="gs-state">
            <div>
              <Plate tone="yellow">SIN DATOS</Plate>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--eg-fg-3)',
                  marginTop: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                Empieza creando tickets y sprints · Start by creating issues and sprints
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
