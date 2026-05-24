// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { portal } from '../../api/client';
import { useToast } from '../../ui/Toast';

type RequestType = 'task' | 'bug';

export function PortalRequestPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const overviewQ = useQuery({
    queryKey: ['portal', 'overview'],
    queryFn: () => portal.overview(),
    staleTime: 60_000,
  });

  const [projectKey, setProjectKey] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<RequestType>('bug');

  const projects = overviewQ.data?.projects ?? [];

  // Auto-select the only project when there's exactly one
  const effectiveProjectKey =
    projectKey || (projects.length === 1 ? projects[0]!.key : '');

  const createRequest = useMutation({
    mutationFn: () =>
      portal.createRequest({
        projectKey: effectiveProjectKey,
        title: title.trim(),
        description: description.trim(),
        type,
      }),
    onSuccess: (issue) => {
      toast({
        tone: 'ok',
        title: 'Solicitud enviada · Request submitted',
        body: `${issue.key} · ${issue.title}`,
      });
      navigate(`/portal/issues/${issue.key}`);
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al enviar · Submission failed',
        body: err instanceof Error ? err.message : String(err),
      });
    },
  });

  const canSubmit =
    !!effectiveProjectKey && title.trim().length > 0 && !createRequest.isPending;

  return (
    <div className="cp-request">
      {/* ── Page header ─────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <button
          type="button"
          className="cp-detail__back"
          onClick={() => navigate('/portal/issues')}
          style={{ marginBottom: 20 }}
        >
          ← Volver · Back
        </button>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: 'var(--eg-yellow)',
            marginBottom: 6,
          }}
        >
          // nueva solicitud · new request
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(28px, 5vw, 48px)',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            color: 'var(--eg-iron)',
            margin: '0 0 4px',
            lineHeight: 1,
          }}
        >
          Nueva solicitud
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-stencil)',
            fontWeight: 700,
            fontSize: 14,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--eg-fg-3)',
            margin: 0,
          }}
        >
          Submit a request · Create issue
        </p>
      </div>

      {/* ── Form ─────────────────────────────────────── */}
      <form
        className="cp-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) createRequest.mutate();
        }}
      >
        {/* Project selector — only shown if multiple projects */}
        {projects.length > 1 && (
          <div className="cp-field">
            <label htmlFor="cp-req-project">
              Proyecto · Project <span>*</span>
            </label>
            <select
              id="cp-req-project"
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value)}
              required
              disabled={createRequest.isPending}
            >
              <option value="">— Seleccionar proyecto · Select project —</option>
              {projects.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.key} · {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Single project indicator */}
        {projects.length === 1 && (
          <div className="cp-field">
            <label>Proyecto · Project</label>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                background: 'var(--eg-iron)',
                color: 'var(--eg-yellow)',
                padding: '8px 14px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span>{projects[0]!.key}</span>
              <span
                style={{
                  fontWeight: 400,
                  color: 'var(--eg-fg-5)',
                  letterSpacing: '0.06em',
                  textTransform: 'none',
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                }}
              >
                {projects[0]!.name}
              </span>
            </div>
          </div>
        )}

        {/* No projects loaded yet */}
        {overviewQ.isLoading && (
          <div className="cp-field">
            <label>Proyecto · Project</label>
            <span className="gs-loading">cargando proyectos · loading projects</span>
          </div>
        )}

        {/* Type selector */}
        <div className="cp-field">
          <label>Tipo · Type <span>*</span></label>
          <div className="cp-type-group">
            <button
              type="button"
              className={'cp-type-btn' + (type === 'bug' ? ' cp-type-btn--active' : '')}
              onClick={() => setType('bug')}
              disabled={createRequest.isPending}
            >
              <span className="cp-type-btn__icon">B</span>
              <span className="cp-type-btn__label">Bug</span>
            </button>
            <button
              type="button"
              className={'cp-type-btn' + (type === 'task' ? ' cp-type-btn--active' : '')}
              onClick={() => setType('task')}
              disabled={createRequest.isPending}
            >
              <span className="cp-type-btn__icon">T</span>
              <span className="cp-type-btn__label">Tarea · Task</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="cp-field">
          <label htmlFor="cp-req-title">
            Título · Title <span>*</span>
          </label>
          <input
            id="cp-req-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Describe el problema o la solicitud · Describe the issue or request"
            required
            maxLength={200}
            disabled={createRequest.isPending}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: title.length > 160 ? 'var(--eg-red)' : 'var(--eg-fg-4)',
              textAlign: 'right',
              letterSpacing: '0.1em',
            }}
          >
            {title.length}/200
          </span>
        </div>

        {/* Description */}
        <div className="cp-field">
          <label htmlFor="cp-req-desc">
            Descripción · Description{' '}
            <span>opcional · optional</span>
          </label>
          <textarea
            id="cp-req-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Pasos para reproducir, capturas de pantalla, contexto adicional… · Steps to reproduce, screenshots, additional context…"
            rows={6}
            maxLength={20000}
            disabled={createRequest.isPending}
            style={{ resize: 'vertical', minHeight: 120, fontSize: 13 }}
          />
        </div>

        {/* Submit */}
        <div className="cp-form__submit">
          <button
            type="submit"
            className="b-btn b-btn--ink"
            disabled={!canSubmit}
            style={{ fontSize: 14, padding: '12px 24px' }}
          >
            {createRequest.isPending
              ? 'Enviando · Sending…'
              : 'Enviar solicitud · Submit request'}
          </button>
          <button
            type="button"
            className="b-btn b-btn--ghost"
            onClick={() => navigate('/portal/issues')}
            disabled={createRequest.isPending}
          >
            Cancelar · Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
