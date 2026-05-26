// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projects, sprints as sprintsApi, ApiError } from '../api/client';
import type { SprintRecord } from '../api/client';
import { Plate, SpinGlyph } from '../ui/atoms';
import { Subbar } from '../ui/Subbar';
import { useToast } from '../ui/Toast';
import { useProjectTabs } from '../hooks/useProjectTabs';

// ── State badge ───────────────────────────────────────────────────────────────
function StateBadge({ state }: { state: SprintRecord['state'] }) {
  const map: Record<SprintRecord['state'], { label: string; bg: string; color: string }> = {
    active: { label: 'ACTIVO', bg: 'var(--eg-yellow)', color: 'var(--eg-iron)' },
    future: { label: 'FUTURO', bg: 'var(--eg-paper-2)', color: 'var(--eg-iron)' },
    closed: { label: 'CERRADO', bg: 'var(--eg-iron)', color: 'var(--eg-paper)' },
  };
  const cfg = map[state];
  return (
    <span
      className="mono"
      style={{
        background: cfg.bg,
        color: cfg.color,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.12em',
        padding: '3px 8px',
        border: '1.5px solid var(--eg-iron)',
        display: 'inline-block',
        textTransform: 'uppercase',
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── Committed vs completed mini-bar ──────────────────────────────────────────
function PointsBar({
  committed,
  completed,
}: {
  committed?: number | null;
  completed?: number | null;
}) {
  const c = committed ?? 0;
  const d = completed ?? 0;
  if (c === 0 && d === 0) return <span className="mono" style={{ fontSize: 11, color: 'var(--eg-fg-4)' }}>—</span>;

  const pct = c > 0 ? Math.min(100, Math.round((d / c) * 100)) : 0;
  const barColor =
    d >= c ? 'var(--eg-green)' : d / c < 0.85 ? 'var(--eg-red)' : 'var(--eg-yellow)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <div
        style={{
          flex: 1,
          height: 8,
          background: 'var(--eg-paper-3)',
          border: '1px solid var(--eg-iron)',
          position: 'relative',
        }}
      >
        {/* committed outline */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(-45deg, var(--eg-paper-3) 0 3px, var(--eg-rule, var(--eg-paper-2)) 3px 6px)',
          }}
        />
        {/* completed fill */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct}%`,
            background: barColor,
            transition: 'width 300ms',
          }}
        />
      </div>
      <span className="mono" style={{ fontSize: 11, color: 'var(--eg-iron)', fontWeight: 700, minWidth: 60, textAlign: 'right' }}>
        {d} / {c} pts
      </span>
    </div>
  );
}

// ── Single sprint row ─────────────────────────────────────────────────────────
function SprintRow({
  sprint,
  projectKey,
}: {
  sprint: SprintRecord;
  projectKey: string;
}) {
  const qc = useQueryClient();
  const toast = useToast();

  const startMut = useMutation({
    mutationFn: () => sprintsApi.start(sprint.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sprints', projectKey] });
      toast({ tone: 'ok', title: 'Sprint iniciado · Sprint started', body: sprint.name });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al iniciar · Start failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const closeMut = useMutation({
    mutationFn: () => sprintsApi.close(sprint.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sprints', projectKey] });
      toast({ tone: 'ok', title: 'Sprint cerrado · Sprint closed', body: sprint.name });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al cerrar · Close failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => sprintsApi.delete(sprint.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sprints', projectKey] });
      toast({ tone: 'ok', title: 'Sprint eliminado · Sprint deleted', body: sprint.name });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al eliminar · Delete failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const dateRange =
    sprint.startDate && sprint.endDate
      ? `${new Date(sprint.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })} → ${new Date(sprint.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}`
      : '—';

  const isActive = sprint.state === 'active';
  const isFuture = sprint.state === 'future';
  const isClosed = sprint.state === 'closed';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '90px 1fr auto 200px auto',
        gap: 18,
        alignItems: 'center',
        padding: '14px 18px',
        borderBottom: '1px solid var(--eg-iron)',
        background: isActive ? 'var(--eg-yellow)' : isClosed ? 'var(--eg-paper-2)' : 'var(--eg-paper)',
      }}
    >
      <StateBadge state={sprint.state} />

      <div>
        <div
          className="disp"
          style={{ fontSize: 16, color: 'var(--eg-iron)', lineHeight: 1, marginBottom: 3 }}
        >
          {sprint.name}
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', letterSpacing: '0.08em' }}>
          {dateRange}
          {sprint.goal ? ` · ${sprint.goal}` : ''}
        </div>
      </div>

      {/* velocity / committed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isClosed && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--eg-fg-3)' }}>
            <SpinGlyph />
          </span>
        )}
        {sprint.committedPoints != null && (
          <span className="mono" style={{ fontSize: 11, color: 'var(--eg-fg-3)', letterSpacing: '0.08em' }}>
            {sprint.committedPoints} pts comprometidos
            {isClosed && sprint.completedPoints != null && ` · ${sprint.completedPoints} hechos`}
          </span>
        )}
      </div>

      <PointsBar
        committed={sprint.committedPoints}
        completed={sprint.velocity?.completedPoints ?? sprint.completedPoints ?? undefined}
      />

      <div style={{ display: 'flex', gap: 6 }}>
        {isFuture && (
          <>
            <button
              className="b-btn b-btn--ink"
              onClick={() => startMut.mutate()}
              disabled={startMut.isPending}
            >
              ▶ Iniciar
            </button>
            <button
              className="b-btn b-btn--ghost"
              onClick={() => {
                if (confirm(`¿Eliminar sprint "${sprint.name}"?`)) deleteMut.mutate();
              }}
              disabled={deleteMut.isPending}
              title="Eliminar sprint"
            >
              ✕
            </button>
          </>
        )}
        {isActive && (
          <button
            className="b-btn b-btn--yellow"
            onClick={() => closeMut.mutate()}
            disabled={closeMut.isPending}
          >
            Cerrar sprint
          </button>
        )}
        {isClosed && (
          <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            CERRADO
          </span>
        )}
      </div>
    </div>
  );
}

// ── Create Sprint inline form ─────────────────────────────────────────────────
function CreateSprintInline({
  projectKey,
  onDone,
}: {
  projectKey: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const mut = useMutation({
    mutationFn: () =>
      projects.sprints.create(projectKey, {
        name: name.trim(),
        goal: goal.trim() || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      }),
    onSuccess: (sprint) => {
      void qc.invalidateQueries({ queryKey: ['sprints', projectKey] });
      toast({ tone: 'ok', title: 'Sprint creado · Sprint created', body: sprint.name });
      onDone();
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al crear sprint · Create failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  return (
    <div
      style={{
        padding: '14px 18px',
        borderBottom: '2px solid var(--eg-iron)',
        background: 'var(--eg-paper-2)',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 2, minWidth: 180 }}>
        <div className="caps" style={{ marginBottom: 4 }}>Nombre · Name</div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="S-05 · Nombre del sprint"
          style={{
            width: '100%',
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            background: 'var(--eg-paper)',
            border: '1.5px solid var(--eg-iron)',
            padding: '6px 9px',
            color: 'var(--eg-iron)',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ flex: 2, minWidth: 160 }}>
        <div className="caps" style={{ marginBottom: 4 }}>Objetivo · Goal</div>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Sprint goal"
          style={{
            width: '100%',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            background: 'var(--eg-paper)',
            border: '1.5px solid var(--eg-iron)',
            padding: '6px 9px',
            color: 'var(--eg-iron)',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div>
        <div className="caps" style={{ marginBottom: 4 }}>Inicio</div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            background: 'var(--eg-paper)',
            border: '1.5px solid var(--eg-iron)',
            padding: '6px 9px',
            color: 'var(--eg-iron)',
          }}
        />
      </div>
      <div>
        <div className="caps" style={{ marginBottom: 4 }}>Fin</div>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            background: 'var(--eg-paper)',
            border: '1.5px solid var(--eg-iron)',
            padding: '6px 9px',
            color: 'var(--eg-iron)',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="b-btn b-btn--ink"
          onClick={() => mut.mutate()}
          disabled={!name.trim() || mut.isPending}
        >
          {mut.isPending ? 'Creando…' : '+ Crear'}
        </button>
        <button className="b-btn" onClick={onDone}>
          Cancelar
        </button>
      </div>
      {mut.isError && (
        <div className="mono" style={{ fontSize: 11, color: 'var(--eg-red)', width: '100%' }}>
          Error: {(mut.error as Error).message}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function SprintsPage() {
  const { key = '' } = useParams<{ key: string }>();
  const [creating, setCreating] = useState(false);

  const sprintsQ = useQuery({
    queryKey: ['sprints', key],
    queryFn: () => projects.sprints.list(key),
    enabled: !!key,
  });

  const tabs = useProjectTabs(key, 'sprints');

  if (sprintsQ.isLoading) {
    return (
      <div className="body">
        <Subbar tabs={tabs} />
        <div className="gs-state">
          <span className="gs-loading">cargando sprints · loading sprints</span>
        </div>
      </div>
    );
  }

  if (sprintsQ.isError) {
    return (
      <div className="body">
        <Subbar tabs={tabs} />
        <div className="gs-state">
          <div>
            <Plate>ERROR</Plate>
            <div className="mono" style={{ fontSize: 12, color: 'var(--eg-red)', marginTop: 8 }}>
              {(sprintsQ.error as Error).message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const allSprints = sprintsQ.data ?? [];
  const active = allSprints.filter((s) => s.state === 'active');
  const future = allSprints.filter((s) => s.state === 'future');
  const closed = allSprints.filter((s) => s.state === 'closed');
  const ordered = [...active, ...future, ...closed];

  return (
    <div className="body">
      <Subbar
        tabs={tabs}
        right={
          <button className="b-btn b-btn--ink" onClick={() => setCreating(true)}>
            + Sprint
          </button>
        }
      />

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
          <Plate tone="yellow">SPRINTS</Plate>
          <span className="disp" style={{ fontSize: 20, color: 'var(--eg-paper)' }}>
            {key} · Lista de Sprints
          </span>
          <span
            className="mono"
            style={{ fontSize: 10, color: 'var(--eg-fg-5)', letterSpacing: '0.12em', marginLeft: 8 }}
          >
            SPRINT LIST · {allSprints.length} TOTAL · {active.length} ACTIVO · {future.length} FUTURO · {closed.length} CERRADO
          </span>
        </div>

        {/* Column headings */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr auto 200px auto',
            gap: 18,
            padding: '6px 18px',
            background: 'var(--eg-paper-3)',
            borderBottom: '1px solid var(--eg-iron)',
          }}
        >
          {['ESTADO', 'SPRINT', 'COMPROMETIDO', 'PROGRESO', 'ACCIONES'].map((h) => (
            <span key={h} className="caps">{h}</span>
          ))}
        </div>

        {/* Create form inline */}
        {creating && (
          <CreateSprintInline projectKey={key} onDone={() => setCreating(false)} />
        )}

        {/* Sprint rows */}
        {ordered.length === 0 ? (
          <div className="gs-state">
            <div>
              <Plate tone="yellow">SIN SPRINTS</Plate>
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
                No hay sprints · Create the first sprint above
              </div>
            </div>
          </div>
        ) : (
          ordered.map((s) => <SprintRow key={s.id} sprint={s} projectKey={key} />)
        )}
      </div>
    </div>
  );
}
