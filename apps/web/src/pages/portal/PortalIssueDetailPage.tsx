// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { issues } from '../../api/client';
import { useToast } from '../../ui/Toast';
import { Avatar, LabelChip, PriorityChip, TypeChip } from '../../ui/atoms';
import { formatMinutes, formatRelativeTime } from '../../lib/format';
import { formatMoney } from '../../lib/money';
import type { StatusCategory } from '@gira/shared';

function statusClass(cat: StatusCategory | undefined): string {
  if (cat === 'in_progress') return 'cp-detail__status cp-detail__status--in_progress';
  if (cat === 'done') return 'cp-detail__status cp-detail__status--done';
  return 'cp-detail__status cp-detail__status--todo';
}

export function PortalIssueDetailPage() {
  const { key: issueKey = '' } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [commentBody, setCommentBody] = useState('');

  const issueQ = useQuery({
    queryKey: ['issue', issueKey],
    queryFn: () => issues.get(issueKey),
    enabled: !!issueKey,
    staleTime: 30_000,
  });

  const costQ = useQuery({
    queryKey: ['issue', issueKey, 'cost'],
    queryFn: () => issues.cost(issueKey),
    enabled: !!issueKey,
    staleTime: 60_000,
  });

  const commentsQ = useQuery({
    queryKey: ['issue', issueKey, 'comments'],
    queryFn: () => issues.comments.list(issueKey),
    enabled: !!issueKey,
    staleTime: 30_000,
  });

  const addComment = useMutation({
    mutationFn: (body: string) => issues.comments.create(issueKey, { body, visibility: 'client' }),
    onSuccess: () => {
      setCommentBody('');
      void queryClient.invalidateQueries({ queryKey: ['issue', issueKey, 'comments'] });
      toast({ tone: 'ok', title: 'Comentario añadido · Comment added' });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al comentar · Comment failed',
        body: err instanceof Error ? err.message : String(err),
      });
    },
  });

  if (issueQ.isLoading) {
    return (
      <div className="gs-state">
        <span className="gs-loading">cargando ticket · loading issue</span>
      </div>
    );
  }

  if (issueQ.isError || !issueQ.data) {
    return (
      <div className="gs-state">
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              background: 'var(--eg-red)',
              color: 'var(--eg-paper)',
              padding: '6px 14px',
              fontWeight: 700,
              display: 'inline-block',
              marginBottom: 12,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            404 · No encontrado · Not found
          </div>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--eg-fg-3)',
              margin: 0,
            }}
          >
            Ticket {issueKey} no existe · Issue {issueKey} not found
          </p>
        </div>
      </div>
    );
  }

  const issue = issueQ.data;
  const cost = costQ.data;
  const comments = commentsQ.data ?? [];

  return (
    <div className="cp-detail">
      {/* ── Back ──────────────────────────────────────── */}
      <button type="button" className="cp-detail__back" onClick={() => navigate('/portal/issues')}>
        ← Volver · Back
      </button>

      {/* ── Issue header ─────────────────────────────── */}
      <div className="cp-detail__header">
        <div className="cp-detail__meta-row">
          <span className="cp-detail__key">{issue.key}</span>
          <TypeChip type={issue.type} />
          <PriorityChip priority={issue.priority} />
          {issue.statusName && (
            <span className={statusClass(issue.statusCategory)}>{issue.statusName}</span>
          )}
          {issue.labels.map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>
        <h1 className="cp-detail__title">{issue.title}</h1>
      </div>

      {/* ── Body + sidebar ────────────────────────────── */}
      <div className="cp-detail__body">
        {/* Main column */}
        <div>
          {/* Description */}
          <div className="cp-detail__desc">
            <div className="cp-detail__desc-head">Descripción · Description</div>
            {issue.description ? (
              <pre className="cp-detail__desc-text">{issue.description}</pre>
            ) : (
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--eg-fg-4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                Sin descripción · No description
              </p>
            )}
          </div>

          {/* Cost box */}
          {(cost || costQ.isLoading) && (
            <div className="cp-cost-box" style={{ marginBottom: 32 }}>
              <div className="cp-cost-box__head">Tiempo y coste · Time &amp; cost</div>
              {costQ.isLoading ? (
                <span className="gs-loading">cargando · loading</span>
              ) : cost ? (
                <>
                  <div className="cp-cost-row">
                    <span className="cp-cost-row__key">Tiempo total · Total time</span>
                    <span className="cp-cost-row__val">{formatMinutes(cost.minutes)}</span>
                  </div>
                  <div className="cp-cost-row">
                    <span className="cp-cost-row__key">Tiempo facturable · Billable time</span>
                    <span className="cp-cost-row__val">{formatMinutes(cost.billableMinutes)}</span>
                  </div>
                  <div className="cp-cost-row cp-cost-row--total">
                    <span className="cp-cost-row__key">Devengado · Accrued</span>
                    <span className="cp-cost-row__val">
                      {formatMoney(cost.accruedCents, cost.currency)}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Comments */}
          <div className="cp-comments">
            <div className="cp-comments__head">
              Comentarios · Comments
              {comments.length > 0 && (
                <span
                  style={{
                    background: 'var(--eg-iron)',
                    color: 'var(--eg-yellow)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    padding: '1px 7px',
                    fontWeight: 700,
                    marginLeft: 8,
                  }}
                >
                  {comments.length}
                </span>
              )}
            </div>

            {commentsQ.isLoading && <span className="gs-loading">cargando · loading</span>}

            {!commentsQ.isLoading && comments.length === 0 && (
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--eg-fg-4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  padding: '16px 0',
                }}
              >
                Sin comentarios · No comments yet
              </p>
            )}

            {comments.map((c) => (
              <div key={c.id} className="cp-comment">
                <div className="cp-comment__meta">
                  {c.author && (
                    <>
                      <Avatar user={c.author} />
                      <span className="cp-comment__author">{c.author.name}</span>
                    </>
                  )}
                  <span style={{ marginLeft: 'auto' }}>{formatRelativeTime(c.createdAt)}</span>
                </div>
                <div className="cp-comment__body">{c.body}</div>
              </div>
            ))}

            {/* Add comment form */}
            <form
              className="cp-comment-form"
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = commentBody.trim();
                if (!trimmed) return;
                addComment.mutate(trimmed);
              }}
            >
              <div className="cp-field">
                <label htmlFor="cp-comment-input">Añadir comentario · Add comment</label>
                <textarea
                  id="cp-comment-input"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Escribe tu comentario · Write your comment…"
                  disabled={addComment.isPending}
                  style={{ minHeight: 80, resize: 'vertical', fontSize: 13 }}
                />
              </div>
              <button
                type="submit"
                className="b-btn b-btn--ink"
                disabled={addComment.isPending || !commentBody.trim()}
              >
                {addComment.isPending ? 'Enviando · Sending…' : 'Enviar · Submit'}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="cp-detail__sidebar">
          <div className="cp-detail__field">
            <span className="cp-detail__field-label">Asignado · Assignee</span>
            {issue.assignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar user={issue.assignee} />
                <span className="cp-detail__field-val">{issue.assignee.name}</span>
              </div>
            ) : (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--eg-fg-4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Sin asignar · Unassigned
              </span>
            )}
          </div>

          <div className="cp-detail__field">
            <span className="cp-detail__field-label">Proyecto · Project</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                background: 'var(--eg-iron)',
                color: 'var(--eg-yellow)',
                padding: '3px 10px',
                display: 'inline-block',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {issue.projectKey}
            </span>
          </div>

          {issue.storyPoints != null && (
            <div className="cp-detail__field">
              <span className="cp-detail__field-label">Puntos · Points</span>
              <span className="cp-detail__field-val">{issue.storyPoints} pts</span>
            </div>
          )}

          {issue.estimateMinutes != null && issue.estimateMinutes > 0 && (
            <div className="cp-detail__field">
              <span className="cp-detail__field-label">Estimación · Estimate</span>
              <span className="cp-detail__field-val">{formatMinutes(issue.estimateMinutes)}</span>
            </div>
          )}

          <div className="cp-detail__field">
            <span className="cp-detail__field-label">Creado · Created</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--eg-fg-2)',
              }}
            >
              {formatRelativeTime(issue.createdAt)}
            </span>
          </div>

          <div className="cp-detail__field">
            <span className="cp-detail__field-label">Actualizado · Updated</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--eg-fg-2)',
              }}
            >
              {formatRelativeTime(issue.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
