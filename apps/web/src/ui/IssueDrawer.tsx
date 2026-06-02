// SPDX-License-Identifier: GPL-3.0-or-later
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { IssueView, StatusView, LabelView, CostView } from '@gira/shared';
import { issues, projects, audit, users, ApiError } from '../api/client';
import type { CommentRecord, WorklogRecord } from '../api/client';
import { Avatar, Bi, LabelChip, Plate, PriorityChip, SpinGlyph, TypeChip } from './atoms';
import { formatMinutes, formatRelativeTime, formatDate } from '../lib/format';
import { formatMoney, formatRatePerHour } from '../lib/money';
import { useActiveTimer, useStartTimer, useStopTimer } from '../hooks/useTimer';
import { useToast } from './Toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface IssueDrawerProps {
  issueKey: string;
  projectKey: string;
  onClose: () => void;
}

// ── SideField helper ──────────────────────────────────────────────────────────

function SideField({ labelEs, labelEn, children }: { labelEs: string; labelEn: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px dashed var(--eg-iron)' }}>
      <div className="caps" style={{ marginBottom: 4 }}>
        // {labelEs} · {labelEn}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ── Timer section ─────────────────────────────────────────────────────────────

function TimerPanel({ issueKey, toast }: { issueKey: string; toast: ReturnType<typeof useToast> }) {
  const activeTimer = useActiveTimer();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const queryClient = useQueryClient();

  const timer = activeTimer.data;
  const isRunningForThisIssue = timer?.issueKey === issueKey;

  // Local elapsed tick while timer is running
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunningForThisIssue && timer) {
      const base = timer.elapsedMinutes * 60;
      setElapsed(base + Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000));
      intervalRef.current = setInterval(() => {
        setElapsed(base + Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunningForThisIssue, timer]);

  const fmtSec = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const handleToggle = () => {
    if (isRunningForThisIssue) {
      stopTimer.mutate(undefined, {
        onSuccess: (log) => {
          void queryClient.invalidateQueries({ queryKey: ['worklogs', issueKey] });
          toast({ tone: 'ok', title: 'Cronómetro parado · Timer stopped', body: formatMinutes(log.minutes) + ' registrados' });
        },
        onError: (err) => {
          toast({ tone: 'danger', title: 'Error al parar · Stop failed', body: err instanceof ApiError ? err.message : 'Error' });
        },
      });
    } else {
      startTimer.mutate(issueKey, {
        onSuccess: () => {
          toast({ tone: 'ok', title: 'Cronómetro iniciado · Timer started' });
        },
        onError: (err) => {
          toast({ tone: 'danger', title: 'Error al iniciar · Start failed', body: err instanceof ApiError ? err.message : 'Error' });
        },
      });
    }
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--eg-iron)',
        background: isRunningForThisIssue ? 'var(--eg-yellow)' : 'var(--eg-paper-2)',
      }}
    >
      <div className="caps" style={{ color: isRunningForThisIssue ? 'var(--eg-iron)' : 'var(--eg-fg-3)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {isRunningForThisIssue && (
            <span
              className="dot live"
              style={{
                width: 8,
                height: 8,
                background: 'var(--eg-red)',
                display: 'inline-block',
                borderRadius: '50%',
              }}
            />
          )}
          // cronómetro · timer · {isRunningForThisIssue ? 'en marcha · running' : 'parado · stopped'}
        </span>
      </div>
      <div
        className="mono"
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: 'var(--eg-iron)',
          letterSpacing: '-0.01em',
          lineHeight: 1.1,
          marginTop: 4,
        }}
      >
        {isRunningForThisIssue ? fmtSec(elapsed) : '00:00:00'}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button
          type="button"
          className="b-btn"
          onClick={handleToggle}
          disabled={startTimer.isPending || stopTimer.isPending}
          style={{
            background: isRunningForThisIssue ? 'var(--eg-red)' : 'var(--eg-green)',
            color: 'var(--eg-paper)',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          {isRunningForThisIssue ? '■ Parar · Stop' : '● Iniciar · Start'}
        </button>
      </div>
    </div>
  );
}

// ── Details tab ───────────────────────────────────────────────────────────────

function DetailsTab({
  issue,
  onSave,
  saving,
}: {
  issue: IssueView;
  onSave: (description: string) => Promise<unknown>;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const begin = () => {
    setDraft(issue.description ?? '');
    setEditing(true);
  };

  const commit = async () => {
    // Unchanged → just close, no needless request.
    if (draft === (issue.description ?? '')) {
      setEditing(false);
      return;
    }
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      // The parent mutation already surfaces the error toast. Keep the editor
      // open so the user's draft isn't lost on a failed save.
    }
  };

  if (editing) {
    return (
      <div>
        <div className="caps" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>// descripción · description · markdown</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', letterSpacing: '0.06em' }}>
            ⌘/CTRL+ENTER · ESC
          </span>
        </div>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void commit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setEditing(false);
            }
          }}
          placeholder="Escribe una descripción… · Write a description… (markdown)"
          style={{
            width: '100%',
            minHeight: 180,
            marginTop: 6,
            padding: '12px 14px',
            border: '2px solid var(--eg-yellow)',
            background: 'var(--eg-yellow-soft)',
            fontFamily: 'var(--font-body)',
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--eg-iron)',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" className="b-btn b-btn--ink" disabled={saving} onClick={() => void commit()}>
            {saving ? 'Guardando…' : 'Guardar · Save'}
          </button>
          <button type="button" className="b-btn b-btn--ghost" disabled={saving} onClick={() => setEditing(false)}>
            Cancelar · Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="caps" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>// descripción · description · markdown</span>
        <button
          type="button"
          className="b-btn b-btn--ghost"
          style={{ fontSize: 11, padding: '2px 8px' }}
          onClick={begin}
          title="Editar descripción · Edit description"
        >
          ✎ Editar · Edit
        </button>
      </div>
      <div
        onClick={issue.description ? undefined : begin}
        style={{
          background: 'var(--eg-paper-2)',
          border: '1.5px solid var(--eg-iron)',
          padding: '12px 14px',
          marginTop: 6,
          fontSize: 13.5,
          lineHeight: 1.55,
          color: 'var(--eg-iron)',
          cursor: issue.description ? 'default' : 'text',
        }}
      >
        {issue.description ? (
          <pre style={{
            margin: 0,
            fontFamily: 'var(--font-body)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {issue.description}
          </pre>
        ) : (
          <span style={{ color: 'var(--eg-fg-4)', fontStyle: 'italic' }}>
            Sin descripción · No description — clic para añadir · click to add
          </span>
        )}
      </div>
    </div>
  );
}

// ── Comments tab ──────────────────────────────────────────────────────────────

function CommentsTab({ issueKey }: { issueKey: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [body, setBody] = useState('');

  const commentsQuery = useQuery({
    queryKey: ['comments', issueKey],
    queryFn: () => issues.comments.list(issueKey),
  });

  const createComment = useMutation({
    mutationFn: (b: string) => issues.comments.create(issueKey, { body: b }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', issueKey] });
      setBody('');
      toast({ tone: 'ok', title: 'Comentario añadido · Comment added' });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al comentar · Comment failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  if (commentsQuery.isLoading) {
    return (
      <div className="gs-state" style={{ flex: 'none', padding: 24 }}>
        <span className="gs-loading">cargando comentarios · loading comments</span>
      </div>
    );
  }

  const comments: CommentRecord[] = commentsQuery.data ?? [];

  return (
    <div>
      {comments.length === 0 && (
        <div style={{ padding: '20px 0', color: 'var(--eg-fg-4)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Sin comentarios · No comments yet
        </div>
      )}
      {comments.map((c, i) => (
        <div
          key={c.id}
          style={{
            display: 'flex',
            gap: 12,
            padding: '12px 0',
            borderBottom: i < comments.length - 1 ? '1px dashed var(--eg-iron)' : 'none',
          }}
        >
          <Avatar user={c.author} lg />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, color: 'var(--eg-iron)' }}>{c.author.name}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', letterSpacing: '0.08em' }}>
                {formatRelativeTime(c.createdAt)}
              </span>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--eg-iron)', marginTop: 4, lineHeight: 1.5 }}>{c.body}</div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 16, border: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper-2)' }}>
        <div className="tag-head">
          <span>// responder · reply</span>
          <span>⌘+ENTER</span>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && body.trim()) {
              e.preventDefault();
              createComment.mutate(body.trim());
            }
          }}
          placeholder="Escribe una respuesta… · Type a reply…"
          style={{
            width: '100%',
            minHeight: 80,
            padding: 12,
            border: 0,
            borderTop: '1px dashed var(--eg-iron)',
            background: 'transparent',
            fontSize: 13,
            color: 'var(--eg-iron)',
            resize: 'vertical',
          }}
        />
        <div style={{ padding: '6px 10px', borderTop: '1px solid var(--eg-iron)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="b-btn b-btn--ink"
            disabled={!body.trim() || createComment.isPending}
            onClick={() => body.trim() && createComment.mutate(body.trim())}
          >
            Enviar · Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Worklogs tab ──────────────────────────────────────────────────────────────

function WorklogsTab({ issueKey }: { issueKey: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [addMinutes, setAddMinutes] = useState('');
  const [addNote, setAddNote] = useState('');
  const [addBillable, setAddBillable] = useState(true);

  const worklogsQuery = useQuery({
    queryKey: ['worklogs', issueKey],
    queryFn: () => issues.worklogs.list(issueKey),
  });

  const createWorklog = useMutation({
    mutationFn: (data: { minutes: number; note: string; billable: boolean }) =>
      issues.worklogs.create(issueKey, data),
    onSuccess: (log) => {
      void queryClient.invalidateQueries({ queryKey: ['worklogs', issueKey] });
      void queryClient.invalidateQueries({ queryKey: ['issue', issueKey] });
      setShowAdd(false);
      setAddMinutes('');
      setAddNote('');
      toast({ tone: 'ok', title: 'Trabajo registrado · Worklog added', body: formatMinutes(log.minutes) });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al registrar · Worklog failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  if (worklogsQuery.isLoading) {
    return (
      <div className="gs-state" style={{ flex: 'none', padding: 24 }}>
        <span className="gs-loading">cargando registros · loading worklogs</span>
      </div>
    );
  }

  const logs: WorklogRecord[] = worklogsQuery.data ?? [];
  const total = logs.reduce((s, l) => s + l.minutes, 0);
  const bill = logs.filter((l) => l.billable).reduce((s, l) => s + l.minutes, 0);

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, border: '1.5px solid var(--eg-iron)', marginBottom: 14 }}>
        {[
          { l: 'total', en: 'total', v: formatMinutes(total), sub: 'todos los registros' },
          { l: 'facturable', en: 'billable', v: formatMinutes(bill), sub: total > 0 ? `${Math.round((bill / total) * 100)}%` : '—' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '10px 12px', borderRight: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper-2)' }}>
            <div className="caps">// {s.l} · {s.en}</div>
            <div className="disp" style={{ fontSize: 22, color: 'var(--eg-iron)', lineHeight: 1.1 }}>{s.v}</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)' }}>{s.sub}</div>
          </div>
        ))}
        <div style={{ padding: '10px 12px', background: 'var(--eg-yellow)' }}>
          <div className="caps">// sin asignar · not billed</div>
          <div className="disp" style={{ fontSize: 22, color: 'var(--eg-iron)', lineHeight: 1.1 }}>{formatMinutes(total - bill)}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)' }}>no facturable</div>
        </div>
      </div>

      {logs.length === 0 && (
        <div style={{ padding: '20px 0', color: 'var(--eg-fg-4)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Sin registros · No worklogs yet
        </div>
      )}

      {logs.map((l) => (
        <WorklogRow key={l.id} log={l} issueKey={issueKey} />
      ))}

      {/* Add worklog form */}
      {showAdd ? (
        <div style={{ marginTop: 12, border: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper-2)' }}>
          <div className="tag-head">
            <span>// añadir registro · add worklog</span>
            <button type="button" className="b-btn b-btn--ghost" onClick={() => setShowAdd(false)} style={{ fontSize: 11 }}>✕</button>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                placeholder="Minutos · Minutes"
                value={addMinutes}
                onChange={(e) => setAddMinutes(e.target.value)}
                style={{ width: '50%', padding: '6px 8px', border: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                <input type="checkbox" checked={addBillable} onChange={(e) => setAddBillable(e.target.checked)} />
                Facturable · Billable
              </label>
            </div>
            <input
              type="text"
              placeholder="Nota · Note"
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              style={{ padding: '6px 8px', border: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
            <button
              type="button"
              className="b-btn b-btn--ink"
              disabled={!addMinutes || Number(addMinutes) <= 0 || createWorklog.isPending}
              onClick={() =>
                createWorklog.mutate({
                  minutes: Number(addMinutes),
                  note: addNote.trim(),
                  billable: addBillable,
                })
              }
            >
              + Guardar · Save
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="b-btn"
          style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
          onClick={() => setShowAdd(true)}
        >
          + Añadir registro · Add worklog
        </button>
      )}
    </div>
  );
}

// One worklog row with inline edit + delete (owner-or-admin; API refuses if the
// worklog is billed on a finalized annex).
function WorklogRow({ log, issueKey }: { log: WorklogRecord; issueKey: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState(String(log.minutes));
  const [note, setNote] = useState(log.note);
  const [billable, setBillable] = useState(log.billable);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['worklogs', issueKey] });
    void queryClient.invalidateQueries({ queryKey: ['issue', issueKey] });
  };
  const onError = (err: unknown) =>
    toast({ tone: 'danger', title: 'Error', body: err instanceof ApiError ? err.message : 'Error' });

  const update = useMutation({
    mutationFn: () => issues.worklogs.update(log.id, { minutes: Number(minutes), note: note.trim(), billable }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
      toast({ tone: 'ok', title: 'Registro actualizado · Worklog updated' });
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => issues.worklogs.delete(log.id),
    onSuccess: () => {
      invalidate();
      toast({ tone: 'ok', title: 'Registro eliminado · Worklog deleted' });
    },
    onError,
  });

  if (editing) {
    return (
      <div style={{ padding: '10px', borderBottom: '1px dashed var(--eg-iron)', background: 'var(--eg-paper-2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            style={{ width: '50%', padding: '6px 8px', border: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} />
            Facturable · Billable
          </label>
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota · Note"
          style={{ padding: '6px 8px', border: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="b-btn b-btn--ink"
            disabled={!minutes || Number(minutes) <= 0 || update.isPending}
            onClick={() => update.mutate()}
          >
            Guardar · Save
          </button>
          <button type="button" className="b-btn b-btn--ghost" onClick={() => setEditing(false)}>
            Cancelar · Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto auto',
        gap: 12,
        alignItems: 'center',
        padding: '8px 10px',
        borderBottom: '1px dashed var(--eg-iron)',
        fontSize: 13,
      }}
    >
      <Avatar user={log.user} />
      <div>
        <div style={{ color: 'var(--eg-iron)' }}>{log.note || '—'}</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', letterSpacing: '0.08em', marginTop: 2 }}>
          {formatRelativeTime(log.loggedAt)}
        </div>
      </div>
      <span className="mono" style={{ fontSize: 11, color: 'var(--eg-iron)', fontWeight: 600 }}>
        {formatMinutes(log.minutes)}
      </span>
      {log.billable ? <span className="chip chip--green">$</span> : <span className="chip chip--low">·</span>}
      <span style={{ display: 'inline-flex', gap: 4 }}>
        <button type="button" className="b-btn b-btn--ghost" title="Editar · Edit" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => setEditing(true)}>
          ✎
        </button>
        <button
          type="button"
          className="b-btn b-btn--ghost"
          title="Eliminar · Delete"
          style={{ fontSize: 11, padding: '2px 6px', color: 'var(--eg-red)' }}
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm('¿Eliminar este registro? · Delete this worklog?')) remove.mutate();
          }}
        >
          ✕
        </button>
      </span>
    </div>
  );
}

// ── Cost tab ──────────────────────────────────────────────────────────────────

function CostTab({ issueKey }: { issueKey: string }) {
  const costQuery = useQuery({
    queryKey: ['cost', issueKey],
    queryFn: () => issues.cost(issueKey),
  });

  if (costQuery.isLoading) {
    return (
      <div className="gs-state" style={{ flex: 'none', padding: 24 }}>
        <span className="gs-loading">calculando coste · calculating cost</span>
      </div>
    );
  }

  if (costQuery.isError || !costQuery.data) {
    return (
      <div style={{ padding: 16, color: 'var(--eg-red)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        Error al cargar el coste · Failed to load cost
      </div>
    );
  }

  const cost: CostView = costQuery.data;

  return (
    <div>
      {/* Accrued cost panel */}
      <div className="caps">// coste devengado · accrued cost</div>
      <div
        style={{
          marginTop: 6,
          background: 'var(--eg-iron)',
          color: 'var(--eg-paper)',
          padding: 20,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 0,
        }}
      >
        <div>
          <div className="caps" style={{ color: 'var(--eg-fg-4)' }}>// facturable · billable</div>
          <div className="disp" style={{ fontSize: 28, color: 'var(--eg-yellow)', lineHeight: 1.05 }}>
            {formatMinutes(cost.billableMinutes)}
          </div>
        </div>
        <div>
          <div className="caps" style={{ color: 'var(--eg-fg-4)' }}>// modo · mode</div>
          <div className="disp" style={{ fontSize: 18, color: 'var(--eg-paper)', lineHeight: 1.05 }}>
            {cost.billingMode === 'fixed' ? 'FIJO' : 'HORA'}
          </div>
          {cost.hourlyCents != null && (
            <div className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-4)', marginTop: 4 }}>
              {formatRatePerHour(cost.hourlyCents, cost.currency)}
            </div>
          )}
        </div>
        <div>
          <div className="caps" style={{ color: 'var(--eg-fg-4)' }}>// devengado · accrued</div>
          <div className="disp" style={{ fontSize: 22, color: 'var(--eg-yellow)', lineHeight: 1.05 }}>
            {formatMoney(cost.accruedCents, cost.currency)}
          </div>
        </div>
      </div>

      <div className="caps" style={{ marginTop: 18 }}>// cálculo · math</div>
      <pre style={{ marginTop: 6, padding: 14, fontSize: 11, lineHeight: 1.7, margin: '6px 0 0' }}>
        {`accruedCents = ${cost.accruedCents}  // ${formatMoney(cost.accruedCents, cost.currency)}
billableMinutes = ${cost.billableMinutes}
totalMinutes    = ${cost.minutes}`}
      </pre>
    </div>
  );
}

// ── Audit mini-tab ────────────────────────────────────────────────────────────

function AuditMiniTab({ issueId }: { issueId: string }) {
  // AuditLog.entityId stores the issue's cuid id (not the PROJ-N key).
  const auditQuery = useQuery({
    queryKey: ['audit', 'issue', issueId],
    queryFn: () => audit.list({ entityType: 'Issue', entityId: issueId, limit: 12 }),
  });

  if (auditQuery.isLoading) {
    return (
      <div className="gs-state" style={{ flex: 'none', padding: 24 }}>
        <span className="gs-loading">cargando auditoría · loading audit</span>
      </div>
    );
  }

  const entries = auditQuery.data?.entries ?? [];

  return (
    <div>
      <div className="caps" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>// sauron · este issue · this issue</span>
        <span style={{ color: 'var(--eg-fg-3)' }}>↗ :666</span>
      </div>
      <div style={{ marginTop: 6, border: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper-2)' }}>
        {entries.length === 0 && (
          <div style={{ padding: 12, color: 'var(--eg-fg-4)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            Sin entradas · No audit entries
          </div>
        )}
        {entries.map((a, i) => (
          <div
            key={a.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 30px 1fr auto',
              gap: 10,
              padding: '8px 12px',
              alignItems: 'center',
              borderBottom: i < entries.length - 1 ? '1px dashed var(--eg-iron)' : 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
            }}
          >
            <span style={{ color: 'var(--eg-fg-3)' }}>{new Date(a.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span style={{ color: 'var(--eg-iron)', fontWeight: 700 }}>{a.actor?.name?.split(' ').map((n) => n[0]).join('') ?? '??'}</span>
            <span>
              <b style={{ color: 'var(--eg-red)' }}>{a.action}</b>
              {a.entityId && <span style={{ color: 'var(--eg-fg-2)' }}> · {a.entityId}</span>}
            </span>
            <span style={{ color: 'var(--eg-fg-4)', fontSize: 10 }}>{a.entityType}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sidebar fields ────────────────────────────────────────────────────────────

function DrawerSidebar({
  issue,
  statuses,
  labels,
  onUpdate,
  onAssigneeChange,
  toast,
}: {
  issue: IssueView;
  statuses: StatusView[];
  labels: LabelView[];
  onUpdate: (data: Partial<{ statusId: string; priority: string; type: string; labelIds: string[]; dueAt: Date | null }>) => void;
  onAssigneeChange: (assigneeId: string | null) => void;
  toast: ReturnType<typeof useToast>;
}) {
  const currentStatus = statuses.find((s) => s.id === issue.statusId);

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => users.list(),
    staleTime: 60_000,
  });

  const userList = usersQuery.data ?? [];

  return (
    <aside style={{ background: 'var(--eg-paper-2)', overflow: 'auto' }}>
      <TimerPanel issueKey={issue.key} toast={toast} />

      <SideField labelEs="estado" labelEn="status">
        <select
          value={issue.statusId}
          onChange={(e) => onUpdate({ statusId: e.target.value })}
          style={{ width: '100%', padding: '4px 8px', border: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {currentStatus && (
          <span
            className="plate"
            style={{
              marginTop: 4,
              display: 'inline-flex',
              background: currentStatus.category === 'done'
                ? 'var(--eg-green)'
                : currentStatus.category === 'in_progress'
                  ? 'var(--eg-yellow)'
                  : 'var(--eg-paper-3)',
              color: currentStatus.category === 'done' ? 'var(--eg-paper)' : 'var(--eg-iron)',
              borderColor: 'var(--eg-iron)',
            }}
          >
            {currentStatus.name.toUpperCase()}
          </span>
        )}
      </SideField>

      <SideField labelEs="asignado" labelEn="assignee">
        <select
          value={issue.assignee?.id ?? ''}
          onChange={(e) => onAssigneeChange(e.target.value || null)}
          style={{
            width: '100%',
            padding: '4px 8px',
            border: '1.5px solid var(--eg-iron)',
            background: 'var(--eg-paper)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
          }}
        >
          <option value="">— sin asignar · unassigned</option>
          {userList.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        {issue.assignee && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Avatar user={issue.assignee} />
            <span style={{ fontSize: 12, color: 'var(--eg-iron)' }}>{issue.assignee.name}</span>
          </span>
        )}
      </SideField>

      <SideField labelEs="reportador" labelEn="reporter">
        {issue.reporter ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Avatar user={issue.reporter} />
            <span style={{ fontSize: 13, color: 'var(--eg-iron)' }}>{issue.reporter.name}</span>
          </span>
        ) : (
          <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-4)' }}>—</span>
        )}
      </SideField>

      <SideField labelEs="prioridad" labelEn="priority">
        <select
          value={issue.priority}
          onChange={(e) => onUpdate({ priority: e.target.value })}
          style={{ width: '100%', marginBottom: 6, padding: '4px 8px', border: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
        >
          {(['low', 'medium', 'high', 'urgent', 'emergency'] as const).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <PriorityChip priority={issue.priority} />
      </SideField>

      <SideField labelEs="tipo" labelEn="type">
        <select
          value={issue.type}
          onChange={(e) => onUpdate({ type: e.target.value })}
          style={{ width: '100%', marginBottom: 6, padding: '4px 8px', border: '1.5px solid var(--eg-iron)', background: 'var(--eg-paper)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
        >
          {(['task', 'bug', 'story', 'epic'] as const).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <TypeChip type={issue.type} />
      </SideField>

      <SideField labelEs="puntos" labelEn="story points">
        <span className="disp" style={{ fontSize: 20, color: 'var(--eg-iron)' }}>
          {issue.storyPoints ?? '—'}
        </span>
      </SideField>

      <SideField labelEs="vencimiento" labelEn="due date">
        <input
          type="date"
          value={issue.dueAt ? issue.dueAt.slice(0, 10) : ''}
          onChange={(e) => {
            onUpdate({ dueAt: e.target.value ? new Date(e.target.value) : null });
          }}
          style={{
            width: '100%',
            padding: '4px 8px',
            border: '1.5px solid var(--eg-iron)',
            background: 'var(--eg-paper)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--eg-iron)',
            boxSizing: 'border-box',
          }}
        />
        {issue.dueAt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            {(() => {
              const isDone = statuses.find((s) => s.id === issue.statusId)?.category === 'done';
              const isOverdue = !isDone && new Date(issue.dueAt!).getTime() < Date.now();
              return (
                <>
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      padding: '1px 5px',
                      border: '1px solid',
                      borderColor: isOverdue ? 'var(--eg-red)' : 'var(--eg-iron)',
                      background: isOverdue ? 'var(--eg-red)' : 'var(--eg-paper-3)',
                      color: isOverdue ? 'var(--eg-paper)' : 'var(--eg-iron)',
                      fontWeight: isOverdue ? 700 : 400,
                    }}
                  >
                    {isOverdue ? '!! VENCIDO · OVERDUE' : formatDate(issue.dueAt!)}
                  </span>
                  <button
                    type="button"
                    className="b-btn b-btn--ghost"
                    style={{ fontSize: 10, padding: '1px 6px' }}
                    onClick={() => onUpdate({ dueAt: null })}
                    title="Quitar fecha · Clear due date"
                  >
                    ✕
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </SideField>

      {issue.estimateMinutes != null && (
        <SideField labelEs="estimación" labelEn="estimate">
          <span className="mono" style={{ fontSize: 12 }}>
            {formatMinutes(issue.estimateMinutes)}
          </span>
          {issue.loggedMinutes != null && (
            <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', marginLeft: 6 }}>
              registrado {formatMinutes(issue.loggedMinutes)}
            </span>
          )}
        </SideField>
      )}

      <SideField labelEs="etiquetas" labelEn="labels">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {issue.labels.map((l) => (
            <button
              key={l.id}
              type="button"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              title="Click to remove · Haz clic para quitar"
              onClick={() =>
                onUpdate({ labelIds: issue.labels.filter((x) => x.id !== l.id).map((x) => x.id) })
              }
            >
              <LabelChip label={l} />
            </button>
          ))}
        </div>
        {labels.filter((l) => !issue.labels.find((x) => x.id === l.id)).length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onUpdate({ labelIds: [...issue.labels.map((x) => x.id), e.target.value] });
              }
            }}
            style={{ width: '100%', padding: '4px 8px', border: '1.5px dashed var(--eg-iron)', background: 'var(--eg-paper)', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--eg-fg-3)' }}
          >
            <option value="">+ Añadir etiqueta · Add label</option>
            {labels
              .filter((l) => !issue.labels.find((x) => x.id === l.id))
              .map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
          </select>
        )}
      </SideField>

      <SideField labelEs="facturación" labelEn="billing">
        <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
          {issue.billingMode === 'fixed' ? 'FIJO · FIXED' : 'POR HORA · HOURLY'}
        </span>
        {issue.billingMode === 'fixed' && issue.fixedPriceCents != null && (
          <div className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', marginTop: 2 }}>
            {formatMoney(issue.fixedPriceCents, 'EUR')}
          </div>
        )}
      </SideField>

      <SideField labelEs="creado" labelEn="created">
        <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', letterSpacing: '0.06em' }}>
          {formatDate(issue.createdAt)}
        </span>
      </SideField>

      <SideField labelEs="actualizado" labelEn="updated">
        <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', letterSpacing: '0.06em' }}>
          {formatRelativeTime(issue.updatedAt)}
        </span>
      </SideField>

      <SideField labelEs="serie" labelEn="serial">
        <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', letterSpacing: '0.06em' }}>
          {issue.key}·{issue.id.slice(0, 8)}
        </span>
      </SideField>
    </aside>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

const DRAWER_TABS = [
  { id: 'details',  es: 'Detalles',    en: 'Details'   },
  { id: 'comments', es: 'Comentarios', en: 'Comments'  },
  { id: 'worklogs', es: 'Registros',   en: 'Worklogs'  },
  { id: 'cost',     es: 'Coste',       en: 'Cost'      },
  { id: 'audit',    es: 'Auditoría',   en: 'Audit'     },
] as const;

type DrawerTab = (typeof DRAWER_TABS)[number]['id'];

export function IssueDrawer({ issueKey, projectKey, onClose }: IssueDrawerProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<DrawerTab>('details');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const issueQuery = useQuery({
    queryKey: ['issue', issueKey],
    queryFn: () => issues.get(issueKey),
  });

  const statusesQuery = useQuery({
    queryKey: ['statuses', projectKey],
    queryFn: () => projects.statuses.list(projectKey),
  });

  const labelsQuery = useQuery({
    queryKey: ['labels', projectKey],
    queryFn: () => projects.labels.list(projectKey),
  });

  const commentsQuery = useQuery({
    queryKey: ['comments', issueKey],
    queryFn: () => issues.comments.list(issueKey),
    enabled: tab === 'comments',
  });

  const worklogsQuery = useQuery({
    queryKey: ['worklogs', issueKey],
    queryFn: () => issues.worklogs.list(issueKey),
    enabled: tab === 'worklogs',
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof issues.update>[1]) => issues.update(issueKey, data),
    onSuccess: (updated, vars) => {
      queryClient.setQueryData(['issue', issueKey], updated);
      void queryClient.invalidateQueries({ queryKey: ['board', projectKey] });
      if ('title' in vars) {
        toast({ tone: 'ok', title: 'Ticket actualizado · Issue updated', body: 'Título guardado · Title saved' });
      } else if ('description' in vars) {
        toast({ tone: 'ok', title: 'Ticket actualizado · Issue updated', body: 'Descripción guardada · Description saved' });
      } else if ('assigneeId' in vars) {
        const name = updated.assignee?.name ?? 'sin asignar · unassigned';
        toast({ tone: 'ok', title: 'Asignación actualizada · Assignee updated', body: name });
      } else if ('labelIds' in vars) {
        toast({ tone: 'ok', title: 'Etiquetas actualizadas · Labels updated' });
      } else if ('dueAt' in vars) {
        const dateStr = updated.dueAt ? formatDate(updated.dueAt) : 'sin fecha · cleared';
        toast({ tone: 'ok', title: 'Vencimiento actualizado · Due date updated', body: dateStr });
      } else {
        toast({ tone: 'ok', title: 'Ticket actualizado · Issue updated' });
      }
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al actualizar · Update failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const moveMutation = useMutation({
    mutationFn: (data: Parameters<typeof issues.move>[1]) => issues.move(issueKey, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['issue', issueKey], updated);
      void queryClient.invalidateQueries({ queryKey: ['board', projectKey] });
      toast({ tone: 'ok', title: 'Ticket actualizado · Issue updated', body: 'Estado cambiado · Status changed' });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al mover · Move failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const issue = issueQuery.data;
  const emergency = issue?.priority === 'emergency';

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleUpdate = (data: Partial<{ statusId: string; priority: string; type: string; labelIds: string[]; dueAt: Date | null }>) => {
    if (data.statusId) {
      moveMutation.mutate({ statusId: data.statusId });
    } else {
      updateMutation.mutate(data as Parameters<typeof issues.update>[1]);
    }
  };

  const handleAssigneeChange = (assigneeId: string | null) => {
    updateMutation.mutate({ assigneeId });
  };

  const handleTitleSave = () => {
    if (titleDraft.trim() && titleDraft !== issue?.title) {
      updateMutation.mutate({ title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const tabCountFor = (id: DrawerTab): number | null => {
    if (id === 'comments') return commentsQuery.data?.length ?? null;
    if (id === 'worklogs') return worklogsQuery.data?.length ?? null;
    return null;
  };

  return (
    <div
      className="gs-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={issueKey}
    >
      <div
        className="gs-drawer"
        style={{
          background: 'var(--eg-paper)',
          borderLeft: '2px solid var(--eg-iron)',
          boxShadow: '-12px 0 0 -8px var(--eg-iron)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '100%',
        }}
      >
        {/* Asset-tag header */}
        <div
          style={{
            background: emergency ? 'var(--eg-red)' : 'var(--eg-iron)',
            color: emergency ? 'var(--eg-paper)' : 'var(--eg-yellow)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            borderBottom: '2px solid var(--eg-iron)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              background: 'var(--eg-yellow)',
              color: 'var(--eg-iron)',
              padding: '3px 8px',
              fontWeight: 700,
              letterSpacing: '0.12em',
            }}
          >
            {issueKey}
          </span>
          {issue && (
            <span style={{ color: emergency ? 'var(--eg-paper)' : 'var(--eg-fg-4)' }}>
              {issue.type} · creado {formatDate(issue.createdAt)} · actualizado {formatRelativeTime(issue.updatedAt)}
            </span>
          )}
          {emergency && (
            <Plate style={{ marginLeft: 'auto', background: 'var(--eg-paper)', color: 'var(--eg-iron)', borderColor: 'var(--eg-paper)' }}>
              !! EMERGENCIA
            </Plate>
          )}
          <span style={{ marginLeft: emergency ? 0 : 'auto', display: 'flex', gap: 10, cursor: 'pointer' }}>
            <span title="Cerrar · Close" onClick={onClose} style={{ opacity: 0.8 }}>✕</span>
          </span>
        </div>

        {/* Emergency hazard band */}
        {emergency && (
          <div
            style={{
              height: 8,
              flexShrink: 0,
              background: 'repeating-linear-gradient(-45deg, var(--eg-yellow) 0 10px, var(--eg-iron) 10px 20px)',
            }}
          />
        )}

        {/* Loading state */}
        {issueQuery.isLoading && (
          <div className="gs-state">
            <span className="gs-loading">cargando ticket · loading issue</span>
          </div>
        )}

        {issueQuery.isError && (
          <div className="gs-state">
            <div>
              <Plate tone="red">ERROR</Plate>
              <p style={{ marginTop: 12, color: 'var(--eg-fg-2)' }}>No se pudo cargar el ticket · Could not load issue</p>
            </div>
          </div>
        )}

        {issue && (
          <div className="gs-drawer__body" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', flex: 1, overflow: 'hidden' }}>
            {/* Main panel */}
            <div style={{ overflow: 'auto', padding: '18px 22px', borderRight: '1px solid var(--eg-iron)' }}>
              <div className="caps">// título · title</div>
              {editingTitle ? (
                <textarea
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTitleSave(); }
                    if (e.key === 'Escape') { setEditingTitle(false); }
                  }}
                  style={{
                    width: '100%',
                    fontSize: 28,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.05,
                    color: 'var(--eg-iron)',
                    border: '2px solid var(--eg-yellow)',
                    background: 'var(--eg-yellow-soft)',
                    padding: '4px 8px',
                    margin: '4px 0 14px',
                    resize: 'none',
                    rows: 2,
                  } as React.CSSProperties}
                />
              ) : (
                <h2
                  className="disp"
                  style={{
                    fontSize: 30,
                    lineHeight: 1.05,
                    color: 'var(--eg-iron)',
                    margin: '4px 0 14px',
                    fontWeight: 900,
                    letterSpacing: '-0.01em',
                    cursor: 'pointer',
                  }}
                  onClick={() => { setTitleDraft(issue.title); setEditingTitle(true); }}
                  title="Haz clic para editar · Click to edit"
                >
                  {issue.title}
                </h2>
              )}

              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: '2px solid var(--eg-iron)', marginBottom: 16, flexShrink: 0 }}>
                {DRAWER_TABS.map((t) => {
                  const count = tabCountFor(t.id);
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      style={{
                        padding: '8px 14px',
                        cursor: 'pointer',
                        background: active ? 'var(--eg-iron)' : 'transparent',
                        color: active ? 'var(--eg-yellow)' : 'var(--eg-fg-3)',
                        borderRight: '1px solid var(--eg-iron)',
                        borderTop: 0,
                        borderBottom: 0,
                        borderLeft: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      <Bi
                        es={t.es}
                        en={t.en}
                        size="tiny"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontSize: 13,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: active ? 'var(--eg-yellow)' : 'var(--eg-fg-3)',
                        }}
                      />
                      {count != null && (
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            padding: '1px 5px',
                            background: active ? 'var(--eg-yellow)' : 'var(--eg-paper-2)',
                            color: active ? 'var(--eg-iron)' : 'var(--eg-fg-3)',
                            border: '1px solid ' + (active ? 'var(--eg-yellow)' : 'var(--eg-iron)'),
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              {tab === 'details'  && (
                <DetailsTab
                  issue={issue}
                  saving={updateMutation.isPending}
                  onSave={(description) => updateMutation.mutateAsync({ description })}
                />
              )}
              {tab === 'comments' && <CommentsTab issueKey={issue.key} />}
              {tab === 'worklogs' && <WorklogsTab issueKey={issue.key} />}
              {tab === 'cost'     && <CostTab issueKey={issue.key} />}
              {tab === 'audit'    && <AuditMiniTab issueId={issue.id} />}
            </div>

            {/* Sidebar */}
            <DrawerSidebar
              issue={issue}
              statuses={statusesQuery.data ?? []}
              labels={labelsQuery.data ?? []}
              onUpdate={handleUpdate}
              onAssigneeChange={handleAssigneeChange}
              toast={toast}
            />
          </div>
        )}
      </div>
    </div>
  );
}
