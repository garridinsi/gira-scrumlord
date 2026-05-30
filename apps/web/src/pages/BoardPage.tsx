// SPDX-License-Identifier: GPL-3.0-or-later
import { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { IssueView, StatusView, LabelView } from '@gira/shared';
import { projects, issues as issuesApi, incidents, sprints, ApiError } from '../api/client';
import type { SprintRecord } from '../api/client';
import { Bi, Plate, SpinGlyph } from '../ui/atoms';
import { useToast } from '../ui/Toast';
import { IssueCard } from '../ui/IssueCard';
import { Subbar } from '../ui/Subbar';
import { IssueDrawer } from '../ui/IssueDrawer';
import { getDropNeighbors } from '../lib/board';
import { formatMoney, formatRatePerHour } from '../lib/money';
import { formatMinutes } from '../lib/format';
import { useProjectTabs } from '../hooks/useProjectTabs';

// ── WIP limits by status name (matching the design) ──────────────────────────
const WIP_LIMITS: Record<string, number> = {
  'In Progress': 5,
  'En Curso': 5,
  'In Review': 3,
  'En Revisión': 3,
};

// ── Create Issue Modal ────────────────────────────────────────────────────────

function CreateIssueModal({
  projectKey,
  defaultStatusId,
  statuses,
  onClose,
}: {
  projectKey: string;
  defaultStatusId?: string;
  statuses: StatusView[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [statusId, setStatusId] = useState(defaultStatusId ?? '');
  const [type, setType] = useState<'task' | 'bug' | 'story' | 'epic'>('task');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent' | 'emergency'>('medium');

  const createMutation = useMutation({
    mutationFn: () =>
      issuesApi.create({
        projectKey,
        title: title.trim(),
        description: '',
        type,
        priority,
        billingMode: 'hourly',
        statusId: statusId || undefined,
      }),
    onSuccess: (issue) => {
      void queryClient.invalidateQueries({ queryKey: ['board', projectKey] });
      toast({ tone: 'ok', title: 'Ticket creado · Issue created', body: issue.key });
      onClose();
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al crear · Create failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  return (
    <div
      className="gs-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Crear ticket"
    >
      <div style={{
        margin: 'auto',
        width: 480,
        background: 'var(--eg-paper)',
        border: '2px solid var(--eg-iron)',
        boxShadow: '4px 4px 0 var(--eg-iron)',
      }}>
        <div className="tag-head" style={{ background: 'var(--eg-iron)', color: 'var(--eg-yellow)' }}>
          <span>// nuevo ticket · new issue</span>
          <button type="button" className="b-btn b-btn--ghost" onClick={onClose} style={{ color: 'var(--eg-yellow)', fontSize: 14 }}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            autoFocus
            type="text"
            placeholder="Título · Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) createMutation.mutate(); }}
            style={{ padding: '8px 10px', border: '1.5px solid var(--eg-iron)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.02em', background: 'var(--eg-paper)' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              style={{ flex: 1, padding: '6px 8px', border: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
            >
              {(['task', 'bug', 'story', 'epic'] as const).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              style={{ flex: 1, padding: '6px 8px', border: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
            >
              {(['low', 'medium', 'high', 'urgent', 'emergency'] as const).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {statuses.length > 0 && (
            <select
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              style={{ padding: '6px 8px', border: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
            >
              <option value="">— columna por defecto · default column</option>
              {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="b-btn b-btn--ghost" onClick={onClose}>Cancelar</button>
            <button
              type="button"
              className="b-btn b-btn--ink"
              disabled={!title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              + Crear · Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sprint header strip ───────────────────────────────────────────────────────

function SprintStrip({
  sprint,
  projectKey,
}: {
  sprint: SprintRecord;
  projectKey: string;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');

  const closeMutation = useMutation({
    mutationFn: () => sprints.close(sprint.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprints', projectKey] });
      toast({ tone: 'ok', title: 'Sprint cerrado · Sprint closed', body: sprint.name });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al cerrar sprint · Close failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const goalMutation = useMutation({
    mutationFn: (goal: string | null) => sprints.update(sprint.id, { goal: goal ?? undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprints', projectKey] });
      toast({ tone: 'ok', title: 'Objetivo guardado · Goal saved', body: sprint.name });
      setEditingGoal(false);
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al guardar objetivo · Goal save failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const handleGoalSave = () => {
    const trimmed = goalDraft.trim();
    goalMutation.mutate(trimmed || null);
  };

  // Day progress
  const now = Date.now();
  const start = sprint.startDate ? new Date(sprint.startDate).getTime() : now;
  const end = sprint.endDate ? new Date(sprint.endDate).getTime() : now;
  const totalDays = Math.max(1, Math.round((end - start) / 86_400_000));
  const dayNum = Math.min(totalDays, Math.max(1, Math.round((now - start) / 86_400_000)));
  const pct = Math.min(100, Math.round((dayNum / totalDays) * 100));

  const committed = sprint.committedPoints ?? 0;
  const hasGoal = !!(sprint.goal && sprint.goal.trim());

  return (
    <div
      style={{
        background: 'var(--eg-iron)',
        color: 'var(--eg-paper)',
        borderBottom: '2px solid var(--eg-iron)',
        flexShrink: 0,
      }}
    >
      {/* Main strip row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto auto',
          gap: 18,
          alignItems: 'center',
          padding: '10px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="plate plate--yellow">SPRINT · ACTIVO</span>
          <Bi
            es={sprint.name}
            en={sprint.name}
            tone="ink"
            style={{
              color: 'var(--eg-paper)',
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-5)', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Día {dayNum} / {totalDays}
          </span>
          <div style={{ position: 'relative', height: 8, background: 'var(--eg-iron-2)', border: '1px solid var(--eg-fg-3)', flex: 1, maxWidth: 320 }}>
            <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: 'var(--eg-yellow)' }} />
          </div>
          {committed > 0 && (
            <span className="mono" style={{ fontSize: 10, color: 'var(--eg-paper)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
              {committed} PTS
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', color: 'var(--eg-paper)' }}>
          <span
            className="mono lore"
            data-lore="velocidad · comprometido vs completado"
            style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--eg-yellow)' }}
          >
            <SpinGlyph /> <b>{committed} PTS</b>
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="b-btn b-btn--yellow"
            disabled={closeMutation.isPending}
            onClick={() => closeMutation.mutate()}
          >
            Cerrar sprint
          </button>
        </div>
      </div>

      {/* Goal row */}
      <div
        style={{
          padding: '6px 20px 8px',
          borderTop: '1px solid var(--eg-iron-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 36,
        }}
      >
        <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-4)', letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          // objetivo · goal
        </span>

        {editingGoal ? (
          <div style={{ display: 'flex', gap: 6, flex: 1 }}>
            <input
              autoFocus
              type="text"
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGoalSave();
                if (e.key === 'Escape') setEditingGoal(false);
              }}
              placeholder="Describe el objetivo del sprint… · Sprint goal…"
              style={{
                flex: 1,
                padding: '3px 8px',
                background: 'var(--eg-iron-2)',
                border: '1.5px solid var(--eg-yellow)',
                color: 'var(--eg-paper)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                letterSpacing: '0.02em',
              }}
            />
            <button
              type="button"
              className="b-btn b-btn--yellow"
              style={{ fontSize: 11, padding: '2px 10px' }}
              disabled={goalMutation.isPending}
              onClick={handleGoalSave}
            >
              Guardar · Save
            </button>
            <button
              type="button"
              className="b-btn b-btn--ghost"
              style={{ color: 'var(--eg-fg-4)', fontSize: 11, padding: '2px 8px' }}
              onClick={() => setEditingGoal(false)}
            >
              ✕
            </button>
          </div>
        ) : hasGoal ? (
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--eg-yellow)',
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              textAlign: 'left',
            }}
            title="Haz clic para editar · Click to edit goal"
            onClick={() => { setGoalDraft(sprint.goal ?? ''); setEditingGoal(true); }}
          >
            {sprint.goal}
          </button>
        ) : (
          <button
            type="button"
            style={{
              background: 'none',
              border: '1px dashed var(--eg-iron-3)',
              cursor: 'pointer',
              padding: '2px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--eg-fg-4)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
            onClick={() => { setGoalDraft(''); setEditingGoal(true); }}
          >
            + Añadir objetivo · Add goal
          </button>
        )}
      </div>
    </div>
  );
}

// ── Emergency banner ──────────────────────────────────────────────────────────

function EmergencyBanner({
  issue,
  onOpen,
  onDismiss,
}: {
  issue: IssueView;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        background: 'repeating-linear-gradient(-45deg, var(--eg-yellow) 0 14px, var(--eg-iron) 14px 28px)',
        padding: 6,
        borderBottom: '2px solid var(--eg-iron)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          background: 'var(--eg-red)',
          color: 'var(--eg-paper)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <span
          className="plate"
          style={{ background: 'var(--eg-paper)', color: 'var(--eg-iron)', borderColor: 'var(--eg-paper)' }}
        >
          !! EMERGENCIA
        </span>
        <span className="disp" style={{ color: 'var(--eg-paper)', fontSize: 18 }}>
          {issue.key} · {issue.title}
        </span>
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, letterSpacing: '0.12em', opacity: 0.8, whiteSpace: 'nowrap' }}>
          PRIORIDAD MÁXIMA · P0
        </span>
        <button
          type="button"
          className="b-btn"
          style={{ background: 'var(--eg-iron)', color: 'var(--eg-yellow)', border: '1.5px solid var(--eg-yellow)' }}
          onClick={onOpen}
        >
          Abrir
        </button>
        <button
          type="button"
          className="b-btn b-btn--ghost"
          style={{ color: 'var(--eg-paper)' }}
          onClick={onDismiss}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Column header ─────────────────────────────────────────────────────────────

function ColHeader({
  status,
  count,
  wipLimit,
  wipDismissed,
  onWipDismiss,
}: {
  status: StatusView;
  count: number;
  wipLimit?: number;
  wipDismissed: boolean;
  onWipDismiss: () => void;
}) {
  const breached = wipLimit != null && count > wipLimit;
  const isDone = status.category === 'done';
  const isInProgress = status.category === 'in_progress';

  const colNames: Record<string, { es: string; en: string }> = {
    'Pendientes': { es: 'Pendientes', en: 'Backlog' },
    'Por Hacer': { es: 'Por Hacer', en: 'To Do' },
    'To Do': { es: 'Por Hacer', en: 'To Do' },
    'In Progress': { es: 'En Curso', en: 'In Progress' },
    'En Curso': { es: 'En Curso', en: 'In Progress' },
    'In Review': { es: 'En Revisión', en: 'In Review' },
    'En Revisión': { es: 'En Revisión', en: 'In Review' },
    'Done': { es: 'Hecho', en: 'Done' },
    'Hecho': { es: 'Hecho', en: 'Done' },
  };

  const names = colNames[status.name] ?? { es: status.name, en: status.name };

  return (
    <div style={{ padding: '0 6px 8px' }}>
      <div
        style={{
          background: isDone ? 'var(--eg-green)' : isInProgress ? 'var(--eg-yellow)' : 'var(--eg-paper-3)',
          color: isDone ? 'var(--eg-paper)' : 'var(--eg-iron)',
          border: '1.5px solid var(--eg-iron)',
          padding: '6px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '1px 1px 0 var(--eg-iron)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: isDone ? 'var(--eg-paper)' : 'var(--eg-iron)',
              marginTop: 4,
              flexShrink: 0,
            }}
          />
          <Bi
            es={names.es}
            en={names.en}
            size="tiny"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 14,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: isDone ? 'var(--eg-paper)' : 'var(--eg-iron)',
            }}
          />
        </span>
        <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
          {count}{wipLimit != null ? `/${wipLimit}` : ''}
        </span>
      </div>

      {breached && !wipDismissed && (
        <div
          style={{
            marginTop: 4,
            padding: '6px 10px',
            background: 'repeating-linear-gradient(-45deg, var(--eg-yellow) 0 8px, var(--eg-iron) 8px 16px)',
          }}
        >
          <div
            style={{
              background: 'var(--eg-paper)',
              padding: '6px 10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1.5px solid var(--eg-iron)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--eg-iron)',
            }}
          >
            <span>!! WIP {count}/{wipLimit} · límite excedido · cap exceeded</span>
            <button
              type="button"
              style={{ cursor: 'pointer', color: 'var(--eg-fg-3)', background: 'none', border: 'none', fontSize: 12 }}
              onClick={onWipDismiss}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Board column ──────────────────────────────────────────────────────────────

function BoardColumn({
  status,
  columnIssues,
  isOver,
  dragKey,
  wipDismissed,
  onWipDismiss,
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  onCardClick,
  onNewIssue,
}: {
  status: StatusView;
  columnIssues: IssueView[];
  isOver: boolean;
  dragKey: string | null;
  wipDismissed: boolean;
  onWipDismiss: () => void;
  onDragOver: (e: React.DragEvent, statusId: string) => void;
  onDrop: (e: React.DragEvent, status: StatusView, colIssues: IssueView[]) => void;
  onDragStart: (e: React.DragEvent, key: string) => void;
  onDragEnd: () => void;
  onCardClick: (key: string) => void;
  onNewIssue: (statusId: string) => void;
}) {
  const wipLimit = WIP_LIMITS[status.name];

  return (
    <div
      onDragOver={(e) => onDragOver(e, status.id)}
      onDrop={(e) => onDrop(e, status, columnIssues)}
      style={{
        width: 'var(--gs-col, 312px)',
        flexShrink: 0,
        background: isOver ? 'var(--eg-yellow-soft)' : 'transparent',
        transition: 'background 120ms',
        display: 'flex',
        flexDirection: 'column',
        border: isOver ? '2px dashed var(--eg-iron)' : '2px dashed transparent',
        minHeight: 600,
      }}
    >
      <ColHeader
        status={status}
        count={columnIssues.length}
        wipLimit={wipLimit}
        wipDismissed={wipDismissed}
        onWipDismiss={onWipDismiss}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 6px 6px', flex: 1 }}>
        {columnIssues.map((issue) => (
          <div
            key={issue.key}
            // The drop handler reads these to compute the insertion index from the
            // pointer position; without it every drop fell through to the column end.
            data-issue-key={issue.key}
            draggable
            onDragStart={(e) => onDragStart(e, issue.key)}
            onDragEnd={onDragEnd}
          >
            <IssueCard
              issue={issue}
              ghost={dragKey === issue.key}
              onClick={() => onCardClick(issue.key)}
            />
          </div>
        ))}

        {columnIssues.length === 0 && (
          <div
            style={{
              border: '1.5px dashed var(--eg-rule)',
              padding: '20px 10px',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--eg-fg-4)',
              textTransform: 'uppercase',
            }}
          >
            Vacío · Empty
          </div>
        )}

        {status.category !== 'done' && (
          <button
            type="button"
            style={{
              marginTop: 4,
              padding: '6px 10px',
              background: 'transparent',
              border: '1.5px dashed var(--eg-rule)',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 12,
              textTransform: 'uppercase',
              color: 'var(--eg-fg-3)',
              letterSpacing: '0.04em',
              textAlign: 'left',
            }}
            onClick={() => onNewIssue(status.id)}
          >
            + Nuevo
          </button>
        )}
      </div>
    </div>
  );
}

// ── Filter state ──────────────────────────────────────────────────────────────

interface FilterState {
  labelId: string | null;
  assigneeId: string | null;
}

// ── BoardPage ─────────────────────────────────────────────────────────────────

export function BoardPage() {
  const { key: projectKey = '' } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Drawer key from query param
  const searchParams = new URLSearchParams(location.search);
  const drawerKey = searchParams.get('issue');

  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [wipDismissed, setWipDismissed] = useState(false);
  const [emergencyDismissed, setEmergencyDismissed] = useState(false);
  const [createStatusId, setCreateStatusId] = useState<string | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<FilterState>({ labelId: null, assigneeId: null });

  const queryClient = useQueryClient();

  // Data queries
  const boardQuery = useQuery({
    queryKey: ['board', projectKey],
    queryFn: () => projects.board(projectKey),
    enabled: !!projectKey,
  });

  const sprintsQuery = useQuery({
    queryKey: ['sprints', projectKey],
    queryFn: () => projects.sprints.list(projectKey),
    enabled: !!projectKey,
  });

  const labelsQuery = useQuery({
    queryKey: ['labels', projectKey],
    queryFn: () => projects.labels.list(projectKey),
    enabled: !!projectKey,
  });

  const incidentsQuery = useQuery({
    queryKey: ['incidents', 'open'],
    queryFn: () => incidents.list('open'),
  });

  // Mutations
  const moveMutation = useMutation({
    mutationFn: ({ issueKey, data }: { issueKey: string; data: Parameters<typeof issuesApi.move>[1] }) =>
      issuesApi.move(issueKey, data),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['board', projectKey] });
      const status = board?.columns.find((c) => c.issues.some((i) => i.key === updated.key))?.status.name;
      if (status) toast({ tone: 'ok', title: `Movido · Moved`, body: `${updated.key} → ${status}` });
    },
    onError: (err) => {
      void queryClient.invalidateQueries({ queryKey: ['board', projectKey] }); // revert optimistic
      toast({ tone: 'danger', title: 'Error al mover · Move failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  // Handlers
  const openDrawer = useCallback((issueKey: string) => {
    navigate(`?issue=${issueKey}`, { replace: true });
  }, [navigate]);

  const closeDrawer = useCallback(() => {
    navigate(location.pathname, { replace: true });
  }, [navigate, location.pathname]);

  const onDragStart = (e: React.DragEvent, key: string) => {
    setDragKey(key);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
  };

  const onDragEnd = () => {
    setDragKey(null);
    setOverCol(null);
  };

  const onDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setOverCol(colId);
  };

  const onDrop = (e: React.DragEvent, status: StatusView, colIssues: IssueView[]) => {
    e.preventDefault();
    if (!dragKey) return;

    // Find drop index from mouse position
    const colEl = e.currentTarget as HTMLElement;
    const cards = colEl.querySelectorAll('[data-issue-key]');
    let dropIndex = colIssues.length;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;
      const rect = card.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        dropIndex = i;
        break;
      }
    }

    const neighbors = getDropNeighbors(colIssues, dropIndex, dragKey);

    // Optimistic update
    const currentBoard = queryClient.getQueryData<typeof boardQuery.data>(['board', projectKey]);
    if (currentBoard) {
      const optimistic = {
        ...currentBoard,
        columns: currentBoard.columns.map((col) => {
          if (col.status.id === status.id) {
            const filtered = col.issues.filter((i) => i.key !== dragKey);
            const movedIssue = currentBoard.columns
              .flatMap((c) => c.issues)
              .find((i) => i.key === dragKey);
            if (!movedIssue) return col;
            const newIssues = [...filtered];
            newIssues.splice(dropIndex, 0, { ...movedIssue, statusId: status.id });
            return { ...col, issues: newIssues };
          }
          return { ...col, issues: col.issues.filter((i) => i.key !== dragKey) };
        }),
      };
      queryClient.setQueryData(['board', projectKey], optimistic);
    }

    moveMutation.mutate({
      issueKey: dragKey,
      data: { statusId: status.id, ...neighbors },
    });

    setDragKey(null);
    setOverCol(null);
  };

  // Derive data
  const board = boardQuery.data;
  const activeSprint = sprintsQuery.data?.find((s) => s.state === 'active') ?? null;
  const labels = labelsQuery.data ?? [];
  const allIssues = board?.columns.flatMap((c) => c.issues) ?? [];

  // Emergency: first emergency priority issue
  const emergencyIssue = allIssues.find((i) => i.priority === 'emergency') ?? null;
  const openIncident = incidentsQuery.data?.find((inc) => inc.issueKey === emergencyIssue?.key) ?? null;

  // Filtered columns
  const filteredColumns = (board?.columns ?? []).map((col) => ({
    ...col,
    issues: col.issues.filter((issue) => {
      if (filter.labelId && !issue.labels.find((l) => l.id === filter.labelId)) return false;
      if (filter.assigneeId && issue.assignee?.id !== filter.assigneeId) return false;
      return true;
    }),
  }));

  const totalIssues = allIssues.length;
  const statuses = board?.columns.map((c) => c.status) ?? [];

  // ── Subbar tabs ───────────────────────────────────────────────────────────
  const boardTabs = useProjectTabs(projectKey, 'board');

  return (
    <div className="body">
      <Subbar
        tabs={boardTabs.map((t, i) => i === 0 ? { ...t, count: totalIssues } : t)}
        right={
          <>
            {/* Label filter pill */}
            <div className="f-pill" style={{ cursor: 'pointer', position: 'relative' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                ETIQUETA{' '}
                <select
                  value={filter.labelId ?? ''}
                  onChange={(e) => setFilter((f) => ({ ...f, labelId: e.target.value || null }))}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--eg-iron)',
                    padding: 0,
                  }}
                >
                  <option value="">cualquiera</option>
                  {labels.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </span>
              <span className="x">▾</span>
            </div>

            {filter.labelId && (
              <button
                type="button"
                className="b-btn b-btn--ghost"
                style={{ fontSize: 10, padding: '2px 8px' }}
                onClick={() => setFilter({ labelId: null, assigneeId: null })}
              >
                ✕ Limpiar filtros
              </button>
            )}

            <button
              type="button"
              className="b-btn b-btn--ink"
              onClick={() => { setCreateStatusId(undefined); setShowCreate(true); }}
            >
              + Nuevo ticket
            </button>
          </>
        }
      />

      {/* Sprint strip */}
      {activeSprint && (
        <SprintStrip sprint={activeSprint} projectKey={projectKey} />
      )}

      {/* Emergency banner */}
      {emergencyIssue && !emergencyDismissed && (
        <EmergencyBanner
          issue={emergencyIssue}
          onOpen={() => openDrawer(emergencyIssue.key)}
          onDismiss={() => setEmergencyDismissed(true)}
        />
      )}

      {/* Board loading / error */}
      {boardQuery.isLoading && (
        <div className="gs-state">
          <span className="gs-loading">cargando tablero · loading board</span>
        </div>
      )}
      {boardQuery.isError && (
        <div className="gs-state">
          <div>
            <Plate tone="red">ERROR</Plate>
            <p style={{ marginTop: 12, color: 'var(--eg-fg-2)' }}>
              No se pudo cargar el tablero · Failed to load board
            </p>
          </div>
        </div>
      )}

      {/* Columns */}
      {board && (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', background: 'var(--eg-paper)' }}>
          <div style={{ display: 'flex', gap: 0, height: '100%', alignItems: 'flex-start' }}>
            {filteredColumns.map((col, ci) => (
              <div key={col.status.id} style={{ display: 'contents' }}>
                <BoardColumn
                  status={col.status}
                  columnIssues={col.issues}
                  isOver={overCol === col.status.id}
                  dragKey={dragKey}
                  wipDismissed={wipDismissed}
                  onWipDismiss={() => setWipDismissed(true)}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onCardClick={openDrawer}
                  onNewIssue={(sid) => { setCreateStatusId(sid); setShowCreate(true); }}
                />

                {/* Hazard divider between columns */}
                {ci < filteredColumns.length - 1 && (
                  <div
                    style={{
                      width: 12,
                      flexShrink: 0,
                      alignSelf: 'stretch',
                      background: 'repeating-linear-gradient(-45deg, var(--eg-yellow) 0 6px, var(--eg-iron) 6px 12px)',
                      marginInline: 6,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issue drawer (query-param driven) */}
      {drawerKey && (
        <IssueDrawer
          issueKey={drawerKey}
          projectKey={projectKey}
          onClose={closeDrawer}
        />
      )}

      {/* Create issue modal */}
      {showCreate && (
        <CreateIssueModal
          projectKey={projectKey}
          defaultStatusId={createStatusId}
          statuses={statuses}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
