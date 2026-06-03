// SPDX-License-Identifier: GPL-3.0-or-later
import { useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IssueView } from '@gira/shared';
import { issues, projects, sprints as sprintsApi, ApiError } from '../api/client';
import type { SprintRecord } from '../api/client';
import { Avatar, LabelChip, Plate, PriorityChip, SpinGlyph, TypeChip } from '../ui/atoms';
import { Subbar } from '../ui/Subbar';
import { useToast } from '../ui/Toast';
import { formatDate, formatMinutes } from '../lib/format';
import { formatMoney } from '../lib/money';
import { FilterBar } from '../ui/FilterBar';
import { useMe } from '../hooks/useAuth';
import { useProjectTabs } from '../hooks/useProjectTabs';

// ── Stat cell inside sprint header ──────────────────────────────────────────
function Stat({
  labelEs,
  labelEn,
  value,
  unit,
  mono,
}: {
  labelEs: string;
  labelEn: string;
  value: string | number;
  unit?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="caps">
        // {labelEs} · {labelEn}
      </div>
      <div
        className={mono ? 'mono' : 'disp'}
        style={{
          fontSize: mono ? 14 : 22,
          color: 'var(--eg-iron)',
          lineHeight: 1.05,
          fontWeight: 700,
          letterSpacing: mono ? '0.02em' : '-0.01em',
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: mono ? 10 : 12, marginLeft: 3, color: 'var(--eg-fg-3)' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Single issue row in a sprint or backlog section ──────────────────────────
function BacklogRow({
  issue,
  odd,
  sprints: sprintList,
  onAssignToSprint,
}: {
  issue: IssueView;
  odd: boolean;
  sprints?: SprintRecord[];
  onAssignToSprint?: (issueKey: string, sprintId: string | null) => void;
}) {
  const loggedH =
    issue.loggedMinutes != null && issue.loggedMinutes > 0
      ? `${(issue.loggedMinutes / 60).toFixed(1)}h`
      : '—';

  const isDone = issue.statusCategory === 'done';
  const dueDate = issue.dueAt ? new Date(issue.dueAt) : null;
  const isOverdue = dueDate != null && !isDone && dueDate.getTime() < Date.now();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '64px 22px 1fr auto auto auto auto auto auto',
        gap: 14,
        alignItems: 'center',
        padding: '9px 14px',
        borderBottom: '1px solid var(--eg-rule, var(--eg-paper-3))',
        background: odd ? 'var(--eg-paper)' : 'var(--eg-paper-2)',
        fontSize: 13,
      }}
    >
      <span
        className="mono"
        style={{ fontWeight: 700, fontSize: 11, color: 'var(--eg-iron)', letterSpacing: '0.04em' }}
      >
        {issue.key}
      </span>
      <TypeChip type={issue.type} />
      <span style={{ color: 'var(--eg-iron)' }}>{issue.title}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {issue.labels.slice(0, 2).map((l) => (
          <LabelChip key={l.id} label={l} />
        ))}
      </div>
      <PriorityChip priority={issue.priority} />
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: 'var(--eg-iron)',
          fontWeight: 600,
          minWidth: 32,
          textAlign: 'right',
        }}
      >
        {issue.storyPoints != null ? `${issue.storyPoints} pts` : '—'}
      </span>
      <span
        className="mono"
        style={{ fontSize: 10, color: 'var(--eg-fg-3)', minWidth: 40, textAlign: 'right' }}
      >
        {loggedH}
      </span>
      {dueDate != null ? (
        <span
          className="mono"
          style={{
            fontSize: 10,
            padding: '1px 5px',
            border: '1px solid',
            borderColor: isOverdue ? 'var(--eg-red)' : 'var(--eg-iron)',
            background: isOverdue ? 'var(--eg-red)' : 'transparent',
            color: isOverdue ? 'var(--eg-paper)' : 'var(--eg-iron)',
            fontWeight: isOverdue ? 700 : 400,
            whiteSpace: 'nowrap',
          }}
          title={`Vencimiento · Due: ${formatDate(issue.dueAt!)}`}
        >
          {isOverdue ? '!!' : ''}
          {formatDate(issue.dueAt!)}
        </span>
      ) : (
        <span />
      )}
      {issue.assignee ? (
        <Avatar user={issue.assignee} />
      ) : (
        <span
          className="avatar"
          style={{ background: 'transparent', borderStyle: 'dashed', color: 'var(--eg-fg-4)' }}
        >
          —
        </span>
      )}
      {sprintList && onAssignToSprint && (
        <select
          title="Asignar a sprint"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            background: 'var(--eg-paper)',
            border: '1px solid var(--eg-iron)',
            color: 'var(--eg-iron)',
            padding: '2px 4px',
            cursor: 'pointer',
          }}
          value={issue.sprintId ?? ''}
          onChange={(e) => onAssignToSprint(issue.key, e.target.value || null)}
        >
          <option value="">— sin sprint</option>
          {sprintList
            .filter((s) => s.state !== 'closed')
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      )}
    </div>
  );
}

// ── Sprint section (active / future) ────────────────────────────────────────
function SprintGroup({
  sprint,
  sprintIssues,
  allSprints,
  projectKey,
  onAssignToSprint,
}: {
  sprint: SprintRecord;
  sprintIssues: IssueView[];
  allSprints: SprintRecord[];
  projectKey: string;
  onAssignToSprint: (issueKey: string, sprintId: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const qc = useQueryClient();
  const toast = useToast();

  const committedPts = sprintIssues.reduce((s, i) => s + (i.storyPoints ?? 0), 0);
  const loggedMin = sprintIssues.reduce((s, i) => s + (i.loggedMinutes ?? 0), 0);
  const loggedH = loggedMin > 0 ? (loggedMin / 60).toFixed(1) : 0;

  const isActive = sprint.state === 'active';
  const plateColor = isActive ? 'yellow' : 'paper';
  const plateLabel = isActive ? 'ACTIVO' : 'FUTURO';

  const startMut = useMutation({
    mutationFn: () => sprintsApi.start(sprint.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sprints', projectKey] });
      void qc.invalidateQueries({ queryKey: ['backlog', projectKey] });
      toast({ tone: 'ok', title: 'Sprint iniciado · Sprint started', body: sprint.name });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al iniciar sprint · Start failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const closeMut = useMutation({
    mutationFn: () => sprintsApi.close(sprint.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sprints', projectKey] });
      void qc.invalidateQueries({ queryKey: ['backlog', projectKey] });
      toast({ tone: 'ok', title: 'Sprint cerrado · Sprint closed', body: sprint.name });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al cerrar sprint · Close failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const dateStr =
    sprint.startDate && sprint.endDate
      ? `${new Date(sprint.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })} → ${new Date(sprint.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}`
      : '—';

  return (
    <section
      style={{
        marginBottom: 22,
        border: '2px solid var(--eg-iron)',
        background: 'var(--eg-paper)',
      }}
    >
      <header
        style={{
          background: isActive ? 'var(--eg-yellow)' : 'var(--eg-paper-2)',
          borderBottom: '2px solid var(--eg-iron)',
          padding: '10px 14px',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto auto',
          gap: 18,
          alignItems: 'center',
        }}
      >
        <Plate tone={plateColor === 'yellow' ? undefined : 'yellow'}>{plateLabel}</Plate>
        <div>
          <div className="disp" style={{ fontSize: 18, color: 'var(--eg-iron)', lineHeight: 1 }}>
            {sprint.name}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--eg-fg-3)',
              letterSpacing: '0.1em',
              marginTop: 3,
            }}
          >
            {dateStr} · {sprintIssues.length} TICKETS
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
          <Stat labelEs="comprometido" labelEn="committed" value={committedPts} unit="pts" />
          <Stat labelEs="registrado" labelEn="logged" value={loggedH} unit="h" />
          <Stat labelEs="objetivo" labelEn="goal" value={sprint.goal ?? '—'} mono />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {isActive ? (
            <>
              <button
                className="b-btn b-btn--yellow"
                onClick={() => closeMut.mutate()}
                disabled={closeMut.isPending}
              >
                Cerrar sprint
              </button>
            </>
          ) : (
            <button
              className="b-btn b-btn--ink"
              onClick={() => startMut.mutate()}
              disabled={startMut.isPending}
            >
              ▶ Iniciar sprint
            </button>
          )}
          <button onClick={() => setOpen(!open)} className="b-btn b-btn--ghost">
            {open ? '▾' : '▸'}
          </button>
        </div>
      </header>

      {/* Progress bar — committed vs logged ratio */}
      {committedPts > 0 && (
        <div
          style={{
            height: 6,
            background: 'var(--eg-paper-3)',
            borderBottom: '1px solid var(--eg-iron)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: `${Math.min(100, Math.round((loggedMin / (committedPts * 60)) * 100))}%`,
              background: 'var(--eg-green)',
            }}
          />
        </div>
      )}

      {open && (
        <div>
          {sprintIssues.length === 0 ? (
            <div
              className="mono"
              style={{
                padding: '14px 18px',
                fontSize: 11,
                color: 'var(--eg-fg-4)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Sin tickets en este sprint · No issues in sprint
            </div>
          ) : (
            <div className="gs-tablewrap" style={{ ['--gs-tw-min' as string]: '720px' }}>
              {sprintIssues.map((iss, i) => (
                <BacklogRow
                  key={iss.key}
                  issue={iss}
                  odd={i % 2 === 1}
                  sprints={allSprints}
                  onAssignToSprint={onAssignToSprint}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Unscheduled backlog section ──────────────────────────────────────────────
function BacklogGroup({
  issues: backlogIssues,
  allSprints,
  onAssignToSprint,
  onCreateIssue,
}: {
  issues: IssueView[];
  allSprints: SprintRecord[];
  onAssignToSprint: (issueKey: string, sprintId: string | null) => void;
  onCreateIssue: () => void;
}) {
  const totalPts = backlogIssues.reduce((s, i) => s + (i.storyPoints ?? 0), 0);

  return (
    <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)' }}>
      <header
        style={{
          background: 'var(--eg-iron)',
          color: 'var(--eg-paper)',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <Plate tone="yellow">PENDIENTES</Plate>
        <span className="disp" style={{ fontSize: 18, color: 'var(--eg-paper)' }}>
          Sin planificar
        </span>
        <span
          className="mono"
          style={{ fontSize: 10, color: 'var(--eg-fg-5)', letterSpacing: '0.12em' }}
        >
          UNSCHEDULED · {backlogIssues.length} TICKETS · {totalPts} POINTS
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="b-btn b-btn--yellow" onClick={onCreateIssue}>
            + Ticket
          </button>
        </div>
      </header>
      <div>
        {backlogIssues.length === 0 ? (
          <div
            className="mono"
            style={{
              padding: '14px 18px',
              fontSize: 11,
              color: 'var(--eg-fg-4)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Backlog vacío · Nothing unscheduled
          </div>
        ) : (
          <div className="gs-tablewrap" style={{ ['--gs-tw-min' as string]: '720px' }}>
            {backlogIssues.map((iss, i) => (
              <BacklogRow
                key={iss.key}
                issue={iss}
                odd={i % 2 === 1}
                sprints={allSprints}
                onAssignToSprint={onAssignToSprint}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Create Sprint modal (lightweight inline form) ────────────────────────────
function CreateSprintModal({ projectKey, onClose }: { projectKey: string; onClose: () => void }) {
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
      onClose();
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al crear sprint · Create failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  return (
    <div className="gs-scrim" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          background: 'var(--eg-paper)',
          border: '2px solid var(--eg-iron)',
          boxShadow: '4px 4px 0 var(--eg-iron)',
          display: 'flex',
          flexDirection: 'column',
          alignSelf: 'flex-start',
          marginTop: 80,
        }}
      >
        <div
          className="tag-head"
          style={{ background: 'var(--eg-iron)', color: 'var(--eg-yellow)', padding: '10px 14px' }}
        >
          <span>// NUEVO SPRINT · NEW SPRINT</span>
          <button
            className="b-btn b-btn--ghost"
            style={{ color: 'var(--eg-yellow)' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="caps" style={{ marginBottom: 4 }}>
              Nombre · Name
            </div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="S-05 · Nombre del sprint"
              style={{
                width: '100%',
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                background: 'var(--eg-paper)',
                border: '1.5px solid var(--eg-iron)',
                padding: '7px 10px',
                color: 'var(--eg-iron)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <div className="caps" style={{ marginBottom: 4 }}>
              Objetivo · Goal
            </div>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Sprint goal (optional)"
              style={{
                width: '100%',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                background: 'var(--eg-paper)',
                border: '1.5px solid var(--eg-iron)',
                padding: '7px 10px',
                color: 'var(--eg-iron)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div className="caps" style={{ marginBottom: 4 }}>
                Inicio · Start
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  background: 'var(--eg-paper)',
                  border: '1.5px solid var(--eg-iron)',
                  padding: '7px 10px',
                  color: 'var(--eg-iron)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <div className="caps" style={{ marginBottom: 4 }}>
                Fin · End
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  background: 'var(--eg-paper)',
                  border: '1.5px solid var(--eg-iron)',
                  padding: '7px 10px',
                  color: 'var(--eg-iron)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          {mut.isError && (
            <div
              className="mono"
              style={{ fontSize: 11, color: 'var(--eg-red)', letterSpacing: '0.08em' }}
            >
              Error: {(mut.error as Error).message}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="b-btn" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="b-btn b-btn--ink"
              onClick={() => mut.mutate()}
              disabled={!name.trim() || mut.isPending}
            >
              {mut.isPending ? 'Creando…' : '+ Crear sprint'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Issue modal ───────────────────────────────────────────────────────
function CreateIssueModal({
  projectKey,
  statusId,
  onClose,
}: {
  projectKey: string;
  statusId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState('');

  const mut = useMutation({
    mutationFn: () =>
      issues.create({
        projectKey,
        title: title.trim(),
        description: '',
        type: 'task',
        priority: 'medium',
        billingMode: 'hourly',
        statusId,
      }),
    onSuccess: (issue) => {
      void qc.invalidateQueries({ queryKey: ['backlog', projectKey] });
      toast({ tone: 'ok', title: 'Ticket creado · Issue created', body: issue.key });
      onClose();
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al crear · Create failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  return (
    <div className="gs-scrim" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          background: 'var(--eg-paper)',
          border: '2px solid var(--eg-iron)',
          boxShadow: '4px 4px 0 var(--eg-iron)',
          alignSelf: 'flex-start',
          marginTop: 80,
          marginRight: 40,
        }}
      >
        <div
          className="tag-head"
          style={{ background: 'var(--eg-iron)', color: 'var(--eg-yellow)', padding: '10px 14px' }}
        >
          <span>// NUEVO TICKET · NEW ISSUE · {projectKey}</span>
          <button
            className="b-btn b-btn--ghost"
            style={{ color: 'var(--eg-yellow)' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="caps" style={{ marginBottom: 4 }}>
              Título · Title
            </div>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim()) mut.mutate();
                if (e.key === 'Escape') onClose();
              }}
              placeholder="Describe el ticket…"
              style={{
                width: '100%',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                background: 'var(--eg-paper)',
                border: '1.5px solid var(--eg-iron)',
                padding: '7px 10px',
                color: 'var(--eg-iron)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {mut.isError && (
            <div className="mono" style={{ fontSize: 11, color: 'var(--eg-red)' }}>
              Error: {(mut.error as Error).message}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="b-btn" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="b-btn b-btn--ink"
              onClick={() => mut.mutate()}
              disabled={!title.trim() || mut.isPending}
            >
              {mut.isPending ? 'Creando…' : '+ Crear ticket'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export function BacklogPage() {
  const { key = '' } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q')?.toLowerCase() ?? '';
  const toast = useToast();
  const me = useMe();

  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  // Filtered results from FilterBar (null = no filter active, use full backlog)
  const [filterResults, setFilterResults] = useState<IssueView[] | null>(null);

  const handleFilterResults = useCallback((results: IssueView[] | null) => {
    setFilterResults(results);
  }, []);

  const qc = useQueryClient();

  const backlogQ = useQuery({
    queryKey: ['backlog', key],
    queryFn: () => projects.backlog(key),
    enabled: !!key,
  });

  const sprintsQ = useQuery({
    queryKey: ['sprints', key],
    queryFn: () => projects.sprints.list(key),
    enabled: !!key,
  });

  const assignMut = useMutation({
    mutationFn: ({ issueKey, sprintId }: { issueKey: string; sprintId: string | null }) =>
      issues.update(issueKey, { sprintId }),
    onSuccess: (_updated, vars) => {
      void qc.invalidateQueries({ queryKey: ['backlog', key] });
      const sprintName = (sprintsQ.data ?? []).find((s) => s.id === vars.sprintId)?.name;
      if (sprintName) {
        toast({
          tone: 'ok',
          title: 'Sprint asignado · Sprint assigned',
          body: `${vars.issueKey} → ${sprintName}`,
        });
      } else {
        toast({ tone: 'ok', title: 'Sprint eliminado · Sprint removed', body: vars.issueKey });
      }
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al asignar sprint · Assign failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const handleAssignToSprint = (issueKey: string, sprintId: string | null) => {
    assignMut.mutate({ issueKey, sprintId });
  };

  // Subbar navigation
  const tabs = useProjectTabs(key, 'backlog');

  const allIssues = backlogQ.data ?? [];

  // FilterBar results override URL search query
  // filterResults === null means no filter bar active; fall back to URL q
  const filtered = filterResults
    ? filterResults
    : q
      ? allIssues.filter((i) => i.title.toLowerCase().includes(q))
      : allIssues;

  // Separate by sprint membership
  const allSprints = sprintsQ.data ?? [];
  const activeSprint = allSprints.find((s) => s.state === 'active');
  const futureSprints = allSprints.filter((s) => s.state === 'future');

  // Issues assigned to a sprint
  const issuesInSprint = (sprintId: string) => filtered.filter((i) => i.sprintId === sprintId);

  // Unassigned to any sprint (true backlog)
  const unassigned = filtered.filter((i) => !i.sprintId);

  if (backlogQ.isLoading || sprintsQ.isLoading) {
    return (
      <div className="body">
        <Subbar tabs={tabs} />
        <div className="gs-state">
          <span className="gs-loading">cargando pendientes · loading backlog</span>
        </div>
      </div>
    );
  }

  if (backlogQ.isError) {
    return (
      <div className="body">
        <Subbar tabs={tabs} />
        <div className="gs-state">
          <div>
            <Plate>ERROR</Plate>
            <div className="mono" style={{ fontSize: 12, color: 'var(--eg-red)', marginTop: 8 }}>
              {(backlogQ.error as Error).message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="body">
      <Subbar
        tabs={tabs}
        right={
          <>
            {q && !filterResults && (
              <span className="f-pill">
                BÚSQUEDA <b>{q}</b>
              </span>
            )}
            <button className="b-btn" onClick={() => setShowCreateSprint(true)}>
              + Sprint
            </button>
            <button className="b-btn b-btn--ink" onClick={() => setShowCreateIssue(true)}>
              + Ticket
            </button>
          </>
        }
      />

      <h1 className="sr-only">Pendientes · Backlog · {key}</h1>
      <FilterBar projectKey={key} myId={me.data?.id ?? null} onResults={handleFilterResults} />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        {/* Active sprint */}
        {activeSprint && (
          <SprintGroup
            sprint={activeSprint}
            sprintIssues={issuesInSprint(activeSprint.id)}
            allSprints={allSprints}
            projectKey={key}
            onAssignToSprint={handleAssignToSprint}
          />
        )}

        {/* Future sprints */}
        {futureSprints.map((sp) => (
          <SprintGroup
            key={sp.id}
            sprint={sp}
            sprintIssues={issuesInSprint(sp.id)}
            allSprints={allSprints}
            projectKey={key}
            onAssignToSprint={handleAssignToSprint}
          />
        ))}

        {/* Unscheduled backlog */}
        <BacklogGroup
          issues={unassigned}
          allSprints={allSprints}
          onAssignToSprint={handleAssignToSprint}
          onCreateIssue={() => setShowCreateIssue(true)}
        />
      </div>

      {showCreateSprint && (
        <CreateSprintModal projectKey={key} onClose={() => setShowCreateSprint(false)} />
      )}
      {showCreateIssue && (
        <CreateIssueModal projectKey={key} onClose={() => setShowCreateIssue(false)} />
      )}
    </div>
  );
}
