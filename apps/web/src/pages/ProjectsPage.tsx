// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateProject } from '@gira/shared';
import { projects, ApiError } from '../api/client';
import { Subbar } from '../ui/Subbar';
import { Plate } from '../ui/atoms';
import { useToast } from '../ui/Toast';

// ── Create Project inline form ────────────────────────────────────────────────
function CreateProjectForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<CreateProject>({
    key: '',
    name: '',
    description: '',
    cadence: 'sprints',
  });

  const mut = useMutation({
    mutationFn: () => projects.create(form),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
      toast({ tone: 'ok', title: 'Proyecto creado · Project created', body: `${p.key} · ${p.name}` });
      onDone();
      const dest = p.cadence === 'monthly' ? `/projects/${p.key}/monthly` : `/projects/${p.key}/board`;
      navigate(dest);
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al crear proyecto · Create failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const fieldStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    background: 'var(--eg-paper)',
    border: '1.5px solid var(--eg-iron)',
    padding: '6px 10px',
    color: 'var(--eg-iron)',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--eg-fg-3)',
    marginBottom: 4,
    display: 'block',
  };

  return (
    <section
      style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)', marginBottom: 24 }}
    >
      <div
        className="tag-head"
        style={{ background: 'var(--eg-yellow)', borderColor: 'var(--eg-iron)' }}
      >
        <span>// NUEVO PROYECTO · NEW PROJECT</span>
        <button className="b-btn b-btn--ghost" style={{ fontSize: 11 }} onClick={onDone}>
          ✕ cancelar
        </button>
      </div>
      <div
        className="gs-form-grid"
        style={{
          padding: '16px 18px',
          display: 'grid',
          gridTemplateColumns: '120px 1fr 1fr auto',
          gap: 12,
          alignItems: 'end',
        }}
      >
        {/* Key */}
        <div>
          <label style={labelStyle}>// clave · key</label>
          <input
            autoFocus
            value={form.key}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase() }))}
            placeholder="MTNR"
            maxLength={10}
            style={{ ...fieldStyle, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}
          />
        </div>

        {/* Name */}
        <div>
          <label style={labelStyle}>// nombre · name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nombre del proyecto"
            style={fieldStyle}
          />
        </div>

        {/* Cadence toggle */}
        <div>
          <label style={labelStyle}>// cadencia · cadence</label>
          <div style={{ display: 'flex', gap: 0, border: '1.5px solid var(--eg-iron)' }}>
            {(['sprints', 'monthly'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, cadence: c }))}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '6px 8px',
                  border: 'none',
                  borderRight: c === 'sprints' ? '1.5px solid var(--eg-iron)' : 'none',
                  cursor: 'pointer',
                  background: form.cadence === c ? 'var(--eg-iron)' : 'var(--eg-paper)',
                  color: form.cadence === c ? 'var(--eg-yellow)' : 'var(--eg-iron)',
                }}
              >
                {c === 'sprints' ? 'Sprints' : 'Mensual · Monthly'}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="b-btn b-btn--ink"
            onClick={() => mut.mutate()}
            disabled={!form.key.trim() || !form.name.trim() || mut.isPending}
          >
            {mut.isPending ? 'Creando…' : '+ Crear'}
          </button>
        </div>
      </div>
      {mut.isError && (
        <div className="mono" style={{ fontSize: 11, color: 'var(--eg-red)', padding: '0 18px 12px' }}>
          Error: {(mut.error as Error).message}
        </div>
      )}
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const list = useQuery({ queryKey: ['projects'], queryFn: () => projects.list() });

  return (
    <div className="body">
      <Subbar
        tabs={[{ es: 'Proyectos', en: 'Projects', active: true, count: list.data?.length ?? null }]}
        right={
          !showCreate ? (
            <button className="b-btn b-btn--ink" onClick={() => setShowCreate(true)}>
              + Proyecto
            </button>
          ) : undefined
        }
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--eg-paper)' }}>
        {showCreate && <CreateProjectForm onDone={() => setShowCreate(false)} />}

        {list.isLoading && (
          <div className="gs-state">
            <span className="gs-loading">cargando proyectos · loading</span>
          </div>
        )}
        {list.isError && (
          <div className="gs-state">
            <span className="mono" style={{ color: 'var(--eg-red)' }}>
              // error al cargar · failed to load
            </span>
          </div>
        )}
        {list.data && list.data.length === 0 && !showCreate && (
          <div className="gs-state">
            <span className="mono" style={{ color: 'var(--eg-fg-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              // sin proyectos · no projects yet
            </span>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {(list.data ?? []).map((p) => {
            const isMonthly = p.cadence === 'monthly';
            const dest = isMonthly ? `/projects/${p.key}/monthly` : `/projects/${p.key}/board`;
            return (
              <Link
                key={p.key}
                to={dest}
                style={{
                  textDecoration: 'none',
                  background: 'var(--eg-paper)',
                  border: '2px solid var(--eg-iron)',
                  boxShadow: '4px 4px 0 var(--eg-iron)',
                  display: 'block',
                }}
              >
                <div className="tag-head">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="mono" style={{ background: 'var(--eg-yellow)', color: 'var(--eg-iron)', padding: '2px 7px', fontWeight: 700, letterSpacing: '0.12em' }}>
                      {p.key}
                    </span>
                    {isMonthly && (
                      <Plate tone="yellow" style={{ fontSize: 9, padding: '1px 5px' }}>MENSUAL</Plate>
                    )}
                  </span>
                  <span>// proyecto</span>
                </div>
                <div style={{ padding: '16px 16px 18px' }}>
                  <div className="disp" style={{ fontSize: 24, color: 'var(--eg-iron)', lineHeight: 1, marginBottom: 8 }}>
                    {p.name}
                  </div>
                  {p.description && (
                    <p style={{ fontSize: 13, color: 'var(--eg-fg-2)', margin: 0, lineHeight: 1.5 }}>{p.description}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
