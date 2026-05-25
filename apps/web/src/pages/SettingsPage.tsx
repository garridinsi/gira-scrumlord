// SPDX-License-Identifier: GPL-3.0-or-later
// Settings: Clientes, Tarifas, Avisos, Integraciones, Equipo — EG "Mantenedor" design.
import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChannelView, IntakeSourceView, UserView, UserKind, UserRole } from '@gira/shared';
import type { CreateUser, UpdateUser } from '@gira/shared';
import { clients, rates, projects, channels, intake, users, ApiError } from '../api/client';
import type { ClientRecord, RateRecord } from '../api/client';
import type { CreateClient, UpdateClient, UpsertRate, CreateChannel, CreateIntakeSource } from '@gira/shared';
import { Subbar } from '../ui/Subbar';
import { Avatar, Plate } from '../ui/atoms';
import { formatRatePerHour } from '../lib/money';
import { useToast } from '../ui/Toast';
import { useMe } from '../hooks/useAuth';

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'clients' | 'rates' | 'channels' | 'intake' | 'team';

const CURRENCIES = ['EUR', 'USD', 'GBP'] as const;

// ── Scope badge ───────────────────────────────────────────────────────────────

function ScopePlate({ scope }: { scope: string }) {
  const bg =
    scope === 'issue'
      ? 'var(--eg-red)'
      : scope === 'project'
        ? 'var(--eg-yellow)'
        : scope === 'client'
          ? 'var(--eg-gold)'
          : 'var(--eg-paper-3)';
  const color =
    scope === 'issue' ? 'var(--eg-paper)' : 'var(--eg-iron)';
  return (
    <span
      className="plate"
      style={{ background: bg, color, borderColor: 'var(--eg-iron)', fontSize: 10 }}
    >
      {scope}
    </span>
  );
}

// ── Inline text field ─────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
        // {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.currentTarget.value)}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          padding: '6px 10px',
          border: '1.5px solid var(--eg-iron)',
          background: 'var(--eg-paper)',
          color: 'var(--eg-iron)',
          outline: 'none',
          width: '100%',
        }}
      />
    </div>
  );
}

function CurrencySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
        // moneda · currency
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          padding: '6px 10px',
          border: '1.5px solid var(--eg-iron)',
          background: 'var(--eg-paper)',
          color: 'var(--eg-iron)',
          outline: 'none',
        }}
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Mini stat cell ───────────────────────────────────────────────────────────

function Mini({
  labelEs,
  labelEn,
  value,
  mono,
}: {
  labelEs: string;
  labelEn: string;
  value: string | number;
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
          fontSize: mono ? 12 : 18,
          color: 'var(--eg-iron)',
          fontWeight: mono ? 600 : 800,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Client CRUD ──────────────────────────────────────────────────────────────

function ClientsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({ queryKey: ['clients'], queryFn: () => clients.list() });

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateClient>({
    name: '',
    slug: '',
    currency: 'EUR',
    notes: '',
  });

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateClient>({});

  const createMut = useMutation({
    mutationFn: (data: CreateClient) => clients.create(data),
    onSuccess: (client) => {
      void qc.invalidateQueries({ queryKey: ['clients'] });
      setShowCreate(false);
      setForm({ name: '', slug: '', currency: 'EUR', notes: '' });
      toast({ tone: 'ok', title: 'Cliente creado · Client created', body: client.name });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al crear cliente · Create failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClient }) =>
      clients.update(id, data),
    onSuccess: (client) => {
      void qc.invalidateQueries({ queryKey: ['clients'] });
      setEditId(null);
      toast({ tone: 'ok', title: 'Cliente actualizado · Client updated', body: client.name });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al actualizar · Update failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => clients.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clients'] });
      toast({ tone: 'ok', title: 'Cliente eliminado · Client deleted' });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al eliminar · Delete failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const startEdit = useCallback((c: ClientRecord) => {
    setEditId(c.id);
    setEditForm({ name: c.name, slug: c.slug, currency: c.currency, notes: c.notes ?? '' });
  }, []);

  if (list.isLoading) {
    return (
      <div className="gs-state">
        <span className="gs-loading">cargando clientes · loading clients</span>
      </div>
    );
  }
  if (list.isError) {
    return (
      <div className="gs-state">
        <span className="mono" style={{ color: 'var(--eg-red)' }}>
          // error al cargar clientes · failed to load
        </span>
      </div>
    );
  }

  const data = list.data ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Create form */}
      {showCreate && (
        <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)' }}>
          <div
            className="tag-head"
            style={{ background: 'var(--eg-yellow)', borderColor: 'var(--eg-iron)' }}
          >
            <span>// NUEVO CLIENTE · NEW CLIENT</span>
            <button
              className="b-btn b-btn--ghost"
              style={{ fontSize: 11, padding: '2px 6px' }}
              onClick={() => setShowCreate(false)}
            >
              ✕ cancelar
            </button>
          </div>
          <div
            style={{
              padding: '16px 18px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 120px 1fr',
              gap: 12,
              alignItems: 'end',
            }}
          >
            <Field
              label="nombre · name"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Acme Corp"
            />
            <Field
              label="slug"
              value={form.slug}
              onChange={(v) => setForm((f) => ({ ...f, slug: v }))}
              placeholder="acme"
            />
            <CurrencySelect
              value={form.currency ?? 'EUR'}
              onChange={(v) => setForm((f) => ({ ...f, currency: v }))}
            />
            <Field
              label="notas · notes"
              value={form.notes ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
              placeholder="opcional · optional"
            />
          </div>
          <div
            style={{
              padding: '0 18px 16px',
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
            }}
          >
            {createMut.isError && (
              <span className="mono" style={{ color: 'var(--eg-red)', fontSize: 11, alignSelf: 'center' }}>
                // error al crear · create failed
              </span>
            )}
            <button
              className="b-btn b-btn--ink"
              onClick={() => createMut.mutate(form)}
              disabled={createMut.isPending || !form.name || !form.slug}
            >
              {createMut.isPending ? '...' : '+ Crear Cliente'}
            </button>
          </div>
        </section>
      )}

      {/* Clients table */}
      <section style={{ border: '2px solid var(--eg-iron)' }}>
        <div
          className="tag-head"
          style={{ background: 'var(--eg-yellow)', padding: '8px 14px', borderColor: 'var(--eg-iron)' }}
        >
          <span>
            // CLIENTES · CLIENTS · {data.length}
          </span>
          <span>SÓLO LECTURA PARA USUARIOS CLIENTE · AISLAMIENTO ESTRICTO POR FILA</span>
        </div>

        {data.length === 0 && (
          <div className="gs-state" style={{ minHeight: 80 }}>
            <span className="mono" style={{ color: 'var(--eg-fg-3)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              // sin clientes · no clients yet
            </span>
          </div>
        )}

        {data.map((c, i) => (
          <div key={c.id}>
            {editId === c.id ? (
              /* Inline edit row */
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: i < data.length - 1 ? '1px solid var(--eg-rule)' : 'none',
                  background: 'var(--eg-yellow-soft)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 120px 1fr auto',
                  gap: 12,
                  alignItems: 'end',
                }}
              >
                <Field
                  label="nombre · name"
                  value={editForm.name ?? ''}
                  onChange={(v) => setEditForm((f) => ({ ...f, name: v }))}
                />
                <Field
                  label="slug"
                  value={editForm.slug ?? ''}
                  onChange={(v) => setEditForm((f) => ({ ...f, slug: v }))}
                />
                <CurrencySelect
                  value={editForm.currency ?? 'EUR'}
                  onChange={(v) => setEditForm((f) => ({ ...f, currency: v }))}
                />
                <Field
                  label="notas · notes"
                  value={editForm.notes ?? ''}
                  onChange={(v) => setEditForm((f) => ({ ...f, notes: v }))}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="b-btn b-btn--ink"
                    style={{ fontSize: 11, padding: '5px 10px' }}
                    onClick={() => updateMut.mutate({ id: c.id, data: editForm })}
                    disabled={updateMut.isPending}
                  >
                    {updateMut.isPending ? '...' : 'guardar'}
                  </button>
                  <button
                    className="b-btn b-btn--ghost"
                    style={{ fontSize: 11 }}
                    onClick={() => setEditId(null)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              /* Display row */
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 1.5fr 80px 1fr 1fr auto',
                  gap: 14,
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: i < data.length - 1 ? '1px solid var(--eg-rule)' : 'none',
                  background: i % 2 ? 'var(--eg-paper)' : 'var(--eg-paper-2)',
                }}
              >
                <Avatar
                  name={c.name}
                  seed={c.id}
                  lg
                  style={{ width: 36, height: 36, fontSize: 13 }}
                />
                <div>
                  <div
                    className="disp"
                    style={{ fontSize: 20, color: 'var(--eg-iron)', lineHeight: 1 }}
                  >
                    {c.name}
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
                    SLUG · {c.slug}
                  </div>
                  {c.notes && (
                    <div className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', marginTop: 2 }}>
                      {c.notes}
                    </div>
                  )}
                </div>
                <Plate tone="yellow">{c.currency}</Plate>
                <Mini labelEs="slug" labelEn="identifier" value={c.slug} mono />
                <Mini labelEs="moneda" labelEn="currency" value={c.currency} mono />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="b-btn"
                    style={{ fontSize: 11, padding: '4px 8px' }}
                    onClick={() => startEdit(c)}
                  >
                    editar
                  </button>
                  <button
                    className="b-btn b-btn--ghost"
                    style={{ fontSize: 11 }}
                    onClick={() => {
                      if (confirm(`¿Borrar cliente "${c.name}"?`)) deleteMut.mutate(c.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      {!showCreate && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="b-btn b-btn--ink" onClick={() => setShowCreate(true)}>
            + Cliente
          </button>
        </div>
      )}
    </div>
  );
}

// ── Rates Tab ────────────────────────────────────────────────────────────────

function RatesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const ratesList = useQuery({ queryKey: ['rates'], queryFn: () => rates.list() });
  const clientsList = useQuery({ queryKey: ['clients'], queryFn: () => clients.list() });
  const projectsList = useQuery({ queryKey: ['projects'], queryFn: () => projects.list() });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    scope: 'default' | 'client' | 'project';
    clientId: string;
    projectId: string;
    hourlyCents: string; // entered as float, multiplied ×100
    currency: string;
  }>({
    scope: 'default',
    clientId: '',
    projectId: '',
    hourlyCents: '',
    currency: 'EUR',
  });

  const upsertMut = useMutation({
    mutationFn: (data: UpsertRate) => rates.upsert(data),
    onSuccess: (_rate, vars) => {
      void qc.invalidateQueries({ queryKey: ['rates'] });
      setShowForm(false);
      setEditId(null);
      setForm({ scope: 'default', clientId: '', projectId: '', hourlyCents: '', currency: 'EUR' });
      const action = editId ? 'Tarifa actualizada · Rate updated' : 'Tarifa creada · Rate created';
      toast({ tone: 'ok', title: action, body: `${vars.scope} · ${formatRatePerHour(Math.round(parseFloat(form.hourlyCents) * 100), form.currency)}` });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error con la tarifa · Rate failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => rates.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rates'] });
      toast({ tone: 'ok', title: 'Tarifa eliminada · Rate deleted' });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al eliminar tarifa · Delete failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  function startEdit(r: RateRecord) {
    setEditId(r.id);
    const scope = r.scope === 'issue' ? 'default' : r.scope; // issue scope set from issue drawer only
    setForm({
      scope: scope as 'default' | 'client' | 'project',
      clientId: r.clientId ?? '',
      projectId: r.projectId ?? '',
      hourlyCents: String((r.hourlyCents / 100).toFixed(2)),
      currency: r.currency,
    });
    setShowForm(true);
  }

  function buildUpsert(): UpsertRate {
    const hourlyCents = Math.round(parseFloat(form.hourlyCents) * 100);
    const base = { hourlyCents, currency: form.currency };
    if (form.scope === 'client') return { ...base, scope: 'client', clientId: form.clientId };
    if (form.scope === 'project') return { ...base, scope: 'project', projectId: form.projectId };
    return { ...base, scope: 'default' };
  }

  const clientMap = Object.fromEntries((clientsList.data ?? []).map((c) => [c.id, c]));
  const projectMap = Object.fromEntries((projectsList.data ?? []).map((p) => [p.id, p]));

  function rateTarget(r: RateRecord): string {
    if (r.scope === 'client' && r.clientId) return clientMap[r.clientId]?.name ?? r.clientId;
    if (r.scope === 'project' && r.projectId)
      return projectMap[r.projectId]?.key ?? r.projectId;
    if (r.scope === 'issue' && r.issueId) return r.issueId;
    return '—';
  }

  function rateApplies(r: RateRecord): string {
    if (r.scope === 'client' && r.clientId) {
      const c = clientMap[r.clientId];
      return c ? `Todos los proyectos de ${c.name}` : 'todos los proyectos del cliente';
    }
    if (r.scope === 'project' && r.projectId) {
      const p = projectMap[r.projectId];
      return p ? `${p.key} · ${p.name}` : 'proyecto específico';
    }
    if (r.scope === 'issue') return 'Issue específica (solo lectura)';
    return 'Todo lo demás · fallback global';
  }

  if (ratesList.isLoading) {
    return (
      <div className="gs-state">
        <span className="gs-loading">cargando tarifas · loading rates</span>
      </div>
    );
  }
  if (ratesList.isError) {
    return (
      <div className="gs-state">
        <span className="mono" style={{ color: 'var(--eg-red)' }}>
          // error al cargar tarifas · failed to load
        </span>
      </div>
    );
  }

  const data = ratesList.data ?? [];
  // Sort: issue → project → client → default
  const scopeOrder: Record<string, number> = { issue: 0, project: 1, client: 2, default: 3 };
  const sorted = [...data].sort((a, b) => (scopeOrder[a.scope] ?? 9) - (scopeOrder[b.scope] ?? 9));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Form */}
      {showForm && (
        <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)' }}>
          <div
            className="tag-head"
            style={{
              background: 'var(--eg-iron)',
              color: 'var(--eg-yellow)',
              padding: '8px 14px',
            }}
          >
            <span>
              // {editId ? 'EDITAR TARIFA · EDIT RATE' : 'NUEVA TARIFA · NEW RATE'}
            </span>
            <button
              className="b-btn b-btn--ghost"
              style={{ fontSize: 11, color: 'var(--eg-paper)' }}
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
            >
              ✕ cancelar
            </button>
          </div>
          <div
            style={{
              padding: '16px 18px',
              display: 'grid',
              gridTemplateColumns: '140px 1fr 160px 120px',
              gap: 12,
              alignItems: 'end',
            }}
          >
            {/* Scope */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
                // ámbito · scope
              </label>
              <select
                value={form.scope}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    scope: e.currentTarget.value as 'default' | 'client' | 'project',
                    clientId: '',
                    projectId: '',
                  }))
                }
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '6px 10px',
                  border: '1.5px solid var(--eg-iron)',
                  background: 'var(--eg-paper)',
                  color: 'var(--eg-iron)',
                  outline: 'none',
                }}
              >
                <option value="default">default</option>
                <option value="client">client</option>
                <option value="project">project</option>
              </select>
            </div>

            {/* Target selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
                // objetivo · target
              </label>
              {form.scope === 'client' ? (
                <select
                  value={form.clientId}
                  onChange={(e) => setForm((f) => ({ ...f, clientId: e.currentTarget.value }))}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    padding: '6px 10px',
                    border: '1.5px solid var(--eg-iron)',
                    background: 'var(--eg-paper)',
                    color: 'var(--eg-iron)',
                    outline: 'none',
                  }}
                >
                  <option value="">— seleccionar cliente —</option>
                  {(clientsList.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : form.scope === 'project' ? (
                <select
                  value={form.projectId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, projectId: e.currentTarget.value }))
                  }
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    padding: '6px 10px',
                    border: '1.5px solid var(--eg-iron)',
                    background: 'var(--eg-paper)',
                    color: 'var(--eg-iron)',
                    outline: 'none',
                  }}
                >
                  <option value="">— seleccionar proyecto —</option>
                  {(projectsList.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.key} · {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  className="mono"
                  style={{
                    fontSize: 12,
                    padding: '6px 10px',
                    border: '1.5px solid var(--eg-rule)',
                    color: 'var(--eg-fg-3)',
                    background: 'var(--eg-paper-2)',
                  }}
                >
                  — aplica a todo (fallback global)
                </div>
              )}
            </div>

            {/* Rate in euros/dollars (stored as cents) */}
            <Field
              label="tarifa /h · rate (EUR/USD/GBP)"
              value={form.hourlyCents}
              onChange={(v) => setForm((f) => ({ ...f, hourlyCents: v }))}
              type="number"
              placeholder="115.00"
            />
            <CurrencySelect
              value={form.currency}
              onChange={(v) => setForm((f) => ({ ...f, currency: v }))}
            />
          </div>
          <div
            style={{
              padding: '0 18px 16px',
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            {upsertMut.isError && (
              <span className="mono" style={{ color: 'var(--eg-red)', fontSize: 11 }}>
                // error · check fields
              </span>
            )}
            <button
              className="b-btn b-btn--ink"
              onClick={() => upsertMut.mutate(buildUpsert())}
              disabled={
                upsertMut.isPending ||
                !form.hourlyCents ||
                isNaN(parseFloat(form.hourlyCents)) ||
                (form.scope === 'client' && !form.clientId) ||
                (form.scope === 'project' && !form.projectId)
              }
            >
              {upsertMut.isPending ? '...' : editId ? 'Guardar Tarifa' : '+ Crear Tarifa'}
            </button>
          </div>
        </section>
      )}

      {/* Rates table */}
      <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)' }}>
        <div
          className="tag-head"
          style={{
            background: 'var(--eg-iron)',
            color: 'var(--eg-yellow)',
            padding: '8px 14px',
            borderColor: 'var(--eg-iron)',
          }}
        >
          <span>
            // TARIFAS · RATES · {data.length} · cadena de resolución · issue → project → client → default
          </span>
          <span>EL ÁMBITO PRIORITARIO DESCIENDE · PRIMER MATCH GANA</span>
        </div>

        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 180px 1fr 160px 90px 80px',
            gap: 0,
            background: 'var(--eg-paper-3)',
            borderBottom: '1.5px solid var(--eg-iron)',
            padding: '8px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--eg-fg-3)',
          }}
        >
          <span>// ámbito · scope</span>
          <span>// objetivo · target</span>
          <span>// aplica a · applies to</span>
          <span>// tarifa · rate</span>
          <span>// moneda · currency</span>
          <span />
        </div>

        {sorted.length === 0 && (
          <div className="gs-state" style={{ minHeight: 80 }}>
            <span className="mono" style={{ color: 'var(--eg-fg-3)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              // sin tarifas · no rates yet
            </span>
          </div>
        )}

        {sorted.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 180px 1fr 160px 90px 80px',
              gap: 0,
              alignItems: 'center',
              padding: '10px 14px',
              borderBottom: i < sorted.length - 1 ? '1px dashed var(--eg-rule)' : 'none',
              fontSize: 13,
            }}
          >
            <span>
              <ScopePlate scope={r.scope} />
            </span>
            <span
              className="mono"
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--eg-iron)' }}
            >
              {rateTarget(r)}
            </span>
            <span style={{ color: 'var(--eg-fg-2)', fontSize: 12 }}>{rateApplies(r)}</span>
            <span
              className="disp"
              style={{ fontSize: 20, color: 'var(--eg-iron)' }}
            >
              {Math.floor(r.hourlyCents / 100)}
              <span style={{ fontSize: 12, color: 'var(--eg-fg-3)' }}>
                ,{String(r.hourlyCents % 100).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 11, marginLeft: 4, color: 'var(--eg-fg-3)' }}>/h</span>
            </span>
            <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
              {r.currency}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {r.scope !== 'issue' && (
                <button
                  className="b-btn b-btn--ghost"
                  style={{ fontSize: 11, padding: '4px 6px' }}
                  onClick={() => startEdit(r)}
                >
                  editar
                </button>
              )}
              <button
                className="b-btn b-btn--ghost"
                style={{ fontSize: 11, padding: '4px 6px', color: 'var(--eg-red)' }}
                onClick={() => {
                  if (confirm(`¿Borrar tarifa ${r.scope} ${formatRatePerHour(r.hourlyCents, r.currency)}?`))
                    deleteMut.mutate(r.id);
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Resolution flowchart */}
      <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)' }}>
        <div className="tag-head" style={{ background: 'var(--eg-paper-2)', padding: '8px 14px' }}>
          <span>// CADENA DE RESOLUCIÓN · RESOLUTION CHAIN</span>
          <span>PRIMER MATCH GANA · NUNCA FLOATS</span>
        </div>
        <div style={{ padding: 18, display: 'flex', gap: 0, alignItems: 'stretch' }}>
          {(
            [
              {
                scope: 'issue',
                label: 'MTNR-18',
                desc: 'override por issue · set from issue drawer',
                active: true,
              },
              {
                scope: 'project',
                label: 'MTNR',
                desc: 'override por proyecto',
                active: false,
              },
              {
                scope: 'client',
                label: 'Mantenedor SL',
                desc: 'fallback de cliente',
                active: false,
              },
              {
                scope: 'default',
                label: '—',
                desc: 'fallback global',
                active: false,
              },
            ] as const
          ).map((s, i, arr) => (
            <ResolutionChainItem key={s.scope} s={s} i={i} total={arr.length} />
          ))}
        </div>
        <div
          style={{
            borderTop: '1px dashed var(--eg-iron)',
            padding: '10px 18px',
            background: 'var(--eg-paper-2)',
          }}
        >
          <code
            style={{ background: 'transparent', border: 0, padding: 0, fontSize: 12 }}
          >
            {`resolveHourlyCents({ issue: 9000, project: 11500, client: 11000, default: 9500 })`}{' '}
            =&gt;{' '}
            <b style={{ color: 'var(--eg-iron)' }}>9000</b>
            <span style={{ color: 'var(--eg-fg-3)' }}>{'  // issue.rate gana · wins'}</span>
          </code>
        </div>
      </section>

      {!showForm && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="b-btn"
            onClick={() => {
              setEditId(null);
              setForm({ scope: 'default', clientId: '', projectId: '', hourlyCents: '', currency: 'EUR' });
              setShowForm(true);
            }}
          >
            + Tarifa
          </button>
        </div>
      )}
    </div>
  );
}

function ResolutionChainItem({
  s,
  i,
  total,
}: {
  s: { scope: string; label: string; desc: string; active: boolean };
  i: number;
  total: number;
}) {
  return (
    <>
      <div
        style={{
          flex: 1,
          border: '1.5px solid var(--eg-iron)',
          background: s.active ? 'var(--eg-yellow)' : 'var(--eg-paper-2)',
          padding: 12,
          opacity: s.active ? 1 : 0.55,
          position: 'relative',
        }}
      >
        <div className="caps" style={{ color: 'var(--eg-iron)' }}>
          // {s.scope}
        </div>
        <div
          className="disp"
          style={{ fontSize: 18, color: 'var(--eg-iron)', lineHeight: 1.1, marginTop: 4 }}
        >
          {s.label}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11,
            marginTop: 6,
            color: 'var(--eg-fg-3)',
            textDecoration: s.active ? 'none' : 'line-through',
          }}
        >
          {s.desc}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            marginTop: 8,
            color: s.active ? 'var(--eg-iron)' : 'var(--eg-fg-3)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          {s.active ? '★ MATCH · GANA' : 'shadowed · tapado'}
        </div>
      </div>
      {i < total - 1 && (
        <div
          style={{
            width: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--eg-iron)',
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 900,
          }}
        >
          →
        </div>
      )}
    </>
  );
}

// ── Channels Tab ─────────────────────────────────────────────────────────────

function ChannelsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({ queryKey: ['channels'], queryFn: () => channels.list() });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateChannel>({
    name: '',
    kind: 'webhook',
    target: '',
    scope: 'global',
    events: ['issue.emergency'],
  });
  const [testResult, setTestResult] = useState<Record<string, string>>({});

  const createMut = useMutation({
    mutationFn: (data: CreateChannel) => channels.create(data),
    onSuccess: (ch) => {
      void qc.invalidateQueries({ queryKey: ['channels'] });
      setShowCreate(false);
      setForm({ name: '', kind: 'webhook', target: '', scope: 'global', events: ['issue.emergency'] });
      toast({ tone: 'ok', title: 'Canal creado · Channel created', body: ch.name });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al crear canal · Create failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => channels.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['channels'] });
      toast({ tone: 'ok', title: 'Canal eliminado · Channel deleted' });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al eliminar canal · Delete failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const testMut = useMutation({
    mutationFn: (id: string) => channels.test(id),
    onSuccess: (result, id) => {
      setTestResult((prev) => ({
        ...prev,
        [id]: result.ok ? 'OK' : (result.error ?? 'error'),
      }));
      if (result.ok) {
        toast({ tone: 'ok', title: 'Canal OK · Channel test passed' });
      } else {
        toast({ tone: 'warn', title: 'Canal con error · Channel test failed', body: result.error ?? 'error' });
      }
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al probar canal · Test failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  if (list.isLoading) {
    return (
      <div className="gs-state">
        <span className="gs-loading">cargando canales · loading channels</span>
      </div>
    );
  }

  const data = list.data ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {showCreate && (
        <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)' }}>
          <div
            className="tag-head"
            style={{ background: 'var(--eg-yellow)', padding: '8px 14px' }}
          >
            <span>// NUEVO CANAL · NEW CHANNEL</span>
            <button
              className="b-btn b-btn--ghost"
              style={{ fontSize: 11 }}
              onClick={() => setShowCreate(false)}
            >
              ✕ cancelar
            </button>
          </div>
          <div
            style={{
              padding: '16px 18px',
              display: 'grid',
              gridTemplateColumns: '1fr 120px 1fr',
              gap: 12,
              alignItems: 'end',
            }}
          >
            <Field
              label="nombre · name"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Alertas Slack"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
                // tipo · kind
              </label>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kind: e.currentTarget.value as 'email' | 'webhook' }))
                }
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '6px 10px',
                  border: '1.5px solid var(--eg-iron)',
                  background: 'var(--eg-paper)',
                  color: 'var(--eg-iron)',
                  outline: 'none',
                }}
              >
                <option value="webhook">webhook</option>
                <option value="email">email</option>
              </select>
            </div>
            <Field
              label="destino · target (URL or email)"
              value={form.target}
              onChange={(v) => setForm((f) => ({ ...f, target: v }))}
              placeholder={form.kind === 'email' ? 'ops@example.com' : 'https://hooks.slack.com/...'}
            />
          </div>
          <div style={{ padding: '0 18px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {createMut.isError && (
              <span className="mono" style={{ color: 'var(--eg-red)', fontSize: 11, alignSelf: 'center' }}>
                // error · check fields
              </span>
            )}
            <button
              className="b-btn b-btn--ink"
              onClick={() => createMut.mutate(form)}
              disabled={createMut.isPending || !form.name || !form.target}
            >
              {createMut.isPending ? '...' : '+ Crear Canal'}
            </button>
          </div>
        </section>
      )}

      <section style={{ border: '2px solid var(--eg-iron)' }}>
        <div
          className="tag-head"
          style={{ background: 'var(--eg-paper-2)', padding: '8px 14px' }}
        >
          <span>// AVISOS · CHANNELS · {data.length}</span>
          <span>WEBHOOK / EMAIL · OUTBOX SEAM</span>
        </div>

        {data.length === 0 && (
          <div className="gs-state" style={{ minHeight: 80 }}>
            <span className="mono" style={{ color: 'var(--eg-fg-3)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              // sin canales · no channels yet
            </span>
          </div>
        )}

        {data.map((ch: ChannelView, i) => (
          <div
            key={ch.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 1fr 80px auto',
              gap: 12,
              alignItems: 'center',
              padding: '10px 14px',
              borderBottom: i < data.length - 1 ? '1px dashed var(--eg-rule)' : 'none',
              background: i % 2 ? 'var(--eg-paper)' : 'var(--eg-paper-2)',
            }}
          >
            <span>
              <span
                className="plate"
                style={{
                  background: ch.kind === 'webhook' ? 'var(--eg-iron)' : 'var(--eg-paper-3)',
                  color: ch.kind === 'webhook' ? 'var(--eg-yellow)' : 'var(--eg-iron)',
                  fontSize: 10,
                }}
              >
                {ch.kind}
              </span>
            </span>
            <div>
              <div
                className="disp"
                style={{ fontSize: 16, color: 'var(--eg-iron)', lineHeight: 1 }}
              >
                {ch.name}
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', marginTop: 2 }}>
                {ch.events.join(' · ')}
              </div>
            </div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--eg-fg-3)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ch.target}
            </div>
            <div>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: ch.active ? 'var(--eg-green)' : 'var(--eg-rule)',
                  display: 'inline-block',
                  borderRadius: '50%',
                  marginRight: 6,
                }}
              />
              <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)' }}>
                {ch.active ? 'activo' : 'inactivo'}
              </span>
              {testResult[ch.id] && (
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: testResult[ch.id] === 'OK' ? 'var(--eg-green)' : 'var(--eg-red)',
                    marginTop: 2,
                  }}
                >
                  {testResult[ch.id]}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="b-btn b-btn--ghost"
                style={{ fontSize: 11, padding: '4px 6px' }}
                onClick={() => testMut.mutate(ch.id)}
                disabled={testMut.isPending}
              >
                test
              </button>
              <button
                className="b-btn b-btn--ghost"
                style={{ fontSize: 11, padding: '4px 6px', color: 'var(--eg-red)' }}
                onClick={() => {
                  if (confirm(`¿Borrar canal "${ch.name}"?`)) deleteMut.mutate(ch.id);
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </section>

      {!showCreate && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="b-btn" onClick={() => setShowCreate(true)}>
            + Canal
          </button>
        </div>
      )}
    </div>
  );
}

// ── Intake Tab ────────────────────────────────────────────────────────────────

function IntakeTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({
    queryKey: ['intake-sources'],
    queryFn: () => intake.sources.list(),
  });
  const projectsList = useQuery({ queryKey: ['projects'], queryFn: () => projects.list() });

  const [showCreate, setShowCreate] = useState(false);
  const [newToken, setNewToken] = useState<{ token: string; intakeUrl: string } | null>(null);
  const [form, setForm] = useState<CreateIntakeSource>({
    name: '',
    kind: 'generic',
    projectId: '',
    defaultType: 'bug',
    defaultPriority: 'high',
  });

  const createMut = useMutation({
    mutationFn: (data: CreateIntakeSource) => intake.sources.create(data),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['intake-sources'] });
      setShowCreate(false);
      setNewToken({ token: result.token, intakeUrl: result.intakeUrl });
      setForm({ name: '', kind: 'generic', projectId: '', defaultType: 'bug', defaultPriority: 'high' });
      toast({ tone: 'ok', title: 'Fuente creada · Source created', body: result.name + ' — copia el token · copy the token' });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al crear fuente · Create failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => intake.sources.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['intake-sources'] });
      toast({ tone: 'ok', title: 'Fuente eliminada · Source deleted' });
    },
    onError: (err) => {
      toast({ tone: 'danger', title: 'Error al eliminar fuente · Delete failed', body: err instanceof ApiError ? err.message : 'Error' });
    },
  });

  if (list.isLoading) {
    return (
      <div className="gs-state">
        <span className="gs-loading">cargando fuentes · loading sources</span>
      </div>
    );
  }

  const data = list.data ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* One-time token reveal */}
      {newToken && (
        <section
          style={{
            border: '2px solid var(--eg-yellow)',
            background: 'var(--eg-iron)',
            padding: '16px 18px',
          }}
        >
          <div className="caps" style={{ color: 'var(--eg-yellow)', marginBottom: 10 }}>
            // TOKEN DE ACCESO · ACCESS TOKEN — COPIA AHORA · COPY NOW · NO SE MUESTRA DE NUEVO
          </div>
          <div
            className="mono"
            style={{
              fontSize: 13,
              color: 'var(--eg-yellow)',
              background: 'var(--eg-iron-2)',
              padding: '10px 14px',
              wordBreak: 'break-all',
              marginBottom: 8,
            }}
          >
            {newToken.token}
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--eg-fg-4)', marginBottom: 12 }}>
            INTAKE URL: {newToken.intakeUrl}
          </div>
          <button
            className="b-btn b-btn--yellow"
            onClick={() => setNewToken(null)}
          >
            Entendido · Got it
          </button>
        </section>
      )}

      {showCreate && (
        <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)' }}>
          <div
            className="tag-head"
            style={{ background: 'var(--eg-yellow)', padding: '8px 14px' }}
          >
            <span>// NUEVA FUENTE · NEW INTAKE SOURCE</span>
            <button
              className="b-btn b-btn--ghost"
              style={{ fontSize: 11 }}
              onClick={() => setShowCreate(false)}
            >
              ✕ cancelar
            </button>
          </div>
          <div
            style={{
              padding: '16px 18px',
              display: 'grid',
              gridTemplateColumns: '1fr 120px 1fr 120px 120px',
              gap: 12,
              alignItems: 'end',
            }}
          >
            <Field
              label="nombre · name"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Grafana prod"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
                // tipo · kind
              </label>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    kind: e.currentTarget.value as 'grafana' | 'wordpress' | 'generic',
                  }))
                }
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '6px 10px',
                  border: '1.5px solid var(--eg-iron)',
                  background: 'var(--eg-paper)',
                  color: 'var(--eg-iron)',
                  outline: 'none',
                }}
              >
                <option value="generic">generic</option>
                <option value="grafana">grafana</option>
                <option value="wordpress">wordpress</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
                // proyecto · project
              </label>
              <select
                value={form.projectId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, projectId: e.currentTarget.value }))
                }
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '6px 10px',
                  border: '1.5px solid var(--eg-iron)',
                  background: 'var(--eg-paper)',
                  color: 'var(--eg-iron)',
                  outline: 'none',
                }}
              >
                <option value="">— seleccionar —</option>
                {(projectsList.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.key} · {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
                // tipo defecto · default type
              </label>
              <select
                value={form.defaultType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    defaultType: e.currentTarget.value as 'task' | 'bug' | 'story' | 'epic',
                  }))
                }
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '6px 10px',
                  border: '1.5px solid var(--eg-iron)',
                  background: 'var(--eg-paper)',
                  color: 'var(--eg-iron)',
                  outline: 'none',
                }}
              >
                <option value="bug">bug</option>
                <option value="task">task</option>
                <option value="story">story</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
                // prioridad defecto
              </label>
              <select
                value={form.defaultPriority}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    defaultPriority: e.currentTarget.value as
                      | 'low'
                      | 'medium'
                      | 'high'
                      | 'urgent'
                      | 'emergency',
                  }))
                }
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '6px 10px',
                  border: '1.5px solid var(--eg-iron)',
                  background: 'var(--eg-paper)',
                  color: 'var(--eg-iron)',
                  outline: 'none',
                }}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
                <option value="emergency">emergency</option>
              </select>
            </div>
          </div>
          <div style={{ padding: '0 18px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {createMut.isError && (
              <span className="mono" style={{ color: 'var(--eg-red)', fontSize: 11, alignSelf: 'center' }}>
                // error · check fields
              </span>
            )}
            <button
              className="b-btn b-btn--ink"
              onClick={() => createMut.mutate(form)}
              disabled={createMut.isPending || !form.name || !form.projectId}
            >
              {createMut.isPending ? '...' : '+ Crear Fuente'}
            </button>
          </div>
        </section>
      )}

      <section style={{ border: '2px solid var(--eg-iron)' }}>
        <div
          className="tag-head"
          style={{ background: 'var(--eg-paper-2)', padding: '8px 14px' }}
        >
          <span>// INTEGRACIONES · INTAKE SOURCES · {data.length}</span>
          <span>TOKEN DE ACCESO · MUESTRA SOLO UNA VEZ · ONLY SHOWN ONCE</span>
        </div>

        {data.length === 0 && (
          <div className="gs-state" style={{ minHeight: 80 }}>
            <span className="mono" style={{ color: 'var(--eg-fg-3)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              // sin fuentes · no intake sources yet
            </span>
          </div>
        )}

        {data.map((src: IntakeSourceView, i) => (
          <div
            key={src.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 100px 100px 80px auto',
              gap: 12,
              alignItems: 'center',
              padding: '10px 14px',
              borderBottom: i < data.length - 1 ? '1px dashed var(--eg-rule)' : 'none',
              background: i % 2 ? 'var(--eg-paper)' : 'var(--eg-paper-2)',
            }}
          >
            <span>
              <span
                className="plate"
                style={{ background: 'var(--eg-paper-3)', color: 'var(--eg-iron)', fontSize: 10 }}
              >
                {src.kind}
              </span>
            </span>
            <div>
              <div className="disp" style={{ fontSize: 16, color: 'var(--eg-iron)', lineHeight: 1 }}>
                {src.name}
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', marginTop: 2 }}>
                project: {src.projectId}
              </div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--eg-fg-3)' }}>
              {src.defaultType}
            </span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--eg-fg-3)' }}>
              {src.defaultPriority}
            </span>
            <div>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: src.active ? 'var(--eg-green)' : 'var(--eg-rule)',
                  display: 'inline-block',
                  borderRadius: '50%',
                  marginRight: 6,
                }}
              />
              <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)' }}>
                {src.active ? 'activo' : 'inactivo'}
              </span>
            </div>
            <button
              className="b-btn b-btn--ghost"
              style={{ fontSize: 11, padding: '4px 6px', color: 'var(--eg-red)' }}
              onClick={() => {
                if (confirm(`¿Borrar fuente "${src.name}"?`)) deleteMut.mutate(src.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </section>

      {!showCreate && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="b-btn" onClick={() => setShowCreate(true)}>
            + Fuente
          </button>
        </div>
      )}
    </div>
  );
}

// ── Team / Users Tab ─────────────────────────────────────────────────────────

const SELECT_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  padding: '6px 10px',
  border: '1.5px solid var(--eg-iron)',
  background: 'var(--eg-paper)',
  color: 'var(--eg-iron)',
  outline: 'none',
};

function TeamTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const me = useMe();
  const isAdmin = me.data?.role === 'admin';

  const usersList = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => users.list(true),
  });
  const clientsList = useQuery({ queryKey: ['clients'], queryFn: () => clients.list() });

  const clientMap: Record<string, ClientRecord> = Object.fromEntries(
    (clientsList.data ?? []).map((c) => [c.id, c]),
  );

  // ── Create form state ──────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{
    email: string;
    name: string;
    kind: UserKind;
    role: UserRole;
    clientId: string;
  }>({
    email: '',
    name: '',
    kind: 'staff',
    role: 'member',
    clientId: '',
  });

  const createMut = useMutation({
    mutationFn: (data: CreateUser) => users.create(data),
    onSuccess: (user) => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setForm({ email: '', name: '', kind: 'staff', role: 'member', clientId: '' });
      toast({ tone: 'ok', title: 'Persona creada · User created', body: user.name });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al crear persona · Create failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUser }) => users.update(id, data),
    onSuccess: (user) => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      toast({ tone: 'ok', title: 'Persona actualizada · User updated', body: user.name });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al actualizar · Update failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  const inviteMut = useMutation({
    mutationFn: (id: string) => users.invite(id),
    onSuccess: () => {
      toast({ tone: 'ok', title: 'Enlace enviado · Link sent' });
    },
    onError: (err) => {
      toast({
        tone: 'danger',
        title: 'Error al invitar · Invite failed',
        body: err instanceof ApiError ? err.message : 'Error',
      });
    },
  });

  function handleCreate() {
    const payload: CreateUser =
      form.kind === 'client'
        ? { email: form.email, name: form.name, kind: form.kind, role: form.role, clientId: form.clientId }
        : { email: form.email, name: form.name, kind: form.kind, role: form.role };
    createMut.mutate(payload);
  }

  const createDisabled =
    createMut.isPending ||
    !form.email ||
    !form.name ||
    (form.kind === 'client' && !form.clientId);

  if (usersList.isLoading) {
    return (
      <div className="gs-state">
        <span className="gs-loading">cargando personas · loading users</span>
      </div>
    );
  }
  if (usersList.isError) {
    return (
      <div className="gs-state">
        <span className="mono" style={{ color: 'var(--eg-red)' }}>
          // error al cargar personas · failed to load
        </span>
      </div>
    );
  }

  const data: UserView[] = usersList.data ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Description header */}
      <div
        style={{
          background: 'var(--eg-paper-2)',
          border: '1.5px solid var(--eg-rule)',
          padding: '10px 14px',
        }}
      >
        <div className="mono" style={{ fontSize: 11, color: 'var(--eg-fg-3)', lineHeight: 1.6 }}>
          Sin contraseñas · acceso por enlace mágico — al crear una persona puede entrar por email.
          <br />
          No passwords — magic-link access. Create a person and they sign in by email.
        </div>
        {!isAdmin && (
          <div
            className="mono"
            style={{
              marginTop: 8,
              fontSize: 11,
              color: 'var(--eg-red)',
              letterSpacing: '0.1em',
            }}
          >
            // Solo admins gestionan el equipo · Only admins manage the team
          </div>
        )}
      </div>

      {/* Create form — admin only */}
      {isAdmin && showCreate && (
        <section style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-paper)' }}>
          <div
            className="tag-head"
            style={{ background: 'var(--eg-yellow)', borderColor: 'var(--eg-iron)' }}
          >
            <span>// INVITAR PERSONA · ADD PERSON</span>
            <button
              className="b-btn b-btn--ghost"
              style={{ fontSize: 11, padding: '2px 6px' }}
              onClick={() => setShowCreate(false)}
            >
              ✕ cancelar
            </button>
          </div>
          <div
            style={{
              padding: '16px 18px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 120px 140px',
              gap: 12,
              alignItems: 'end',
            }}
          >
            <Field
              label="email"
              value={form.email}
              type="email"
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              placeholder="persona@ejemplo.com"
            />
            <Field
              label="nombre · name"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Nombre Apellido"
            />
            {/* Kind toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
                // tipo · kind
              </label>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    kind: e.currentTarget.value as UserKind,
                    clientId: '',
                  }))
                }
                style={SELECT_STYLE}
              >
                <option value="staff">staff · equipo</option>
                <option value="client">client · cliente</option>
              </select>
            </div>
            {/* Role */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
                // rol · role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.currentTarget.value as UserRole }))}
                style={SELECT_STYLE}
              >
                <option value="admin">Admin</option>
                <option value="member">Miembro · Member</option>
                <option value="viewer">Lector · Viewer</option>
              </select>
            </div>
          </div>
          {/* Client picker — conditional on kind === 'client' */}
          {form.kind === 'client' && (
            <div style={{ padding: '0 18px 14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 280 }}>
                <label className="caps" style={{ color: 'var(--eg-fg-3)' }}>
                  // cliente · client (obligatorio · required)
                </label>
                <select
                  value={form.clientId}
                  onChange={(e) => setForm((f) => ({ ...f, clientId: e.currentTarget.value }))}
                  style={{ ...SELECT_STYLE, borderColor: !form.clientId ? 'var(--eg-red)' : 'var(--eg-iron)' }}
                >
                  <option value="">— seleccionar cliente —</option>
                  {(clientsList.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div
            style={{ padding: '0 18px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}
          >
            {createMut.isError && (
              <span
                className="mono"
                style={{ color: 'var(--eg-red)', fontSize: 11, alignSelf: 'center' }}
              >
                // error · check fields
              </span>
            )}
            <button
              className="b-btn b-btn--ink"
              onClick={handleCreate}
              disabled={createDisabled}
            >
              {createMut.isPending ? '...' : '+ Invitar Persona · Add Person'}
            </button>
          </div>
        </section>
      )}

      {/* Users table */}
      <section style={{ border: '2px solid var(--eg-iron)' }}>
        <div
          className="tag-head"
          style={{ background: 'var(--eg-iron)', color: 'var(--eg-yellow)', padding: '8px 14px', borderColor: 'var(--eg-iron)' }}
        >
          <span>// EQUIPO · TEAM · {data.length}</span>
          <span>ACCESO POR ENLACE MÁGICO · MAGIC-LINK ACCESS</span>
        </div>

        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '44px 1.4fr 1.6fr 110px 90px 90px auto',
            gap: 0,
            background: 'var(--eg-paper-3)',
            borderBottom: '1.5px solid var(--eg-iron)',
            padding: '7px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--eg-fg-3)',
          }}
        >
          <span />
          <span>// nombre · name</span>
          <span>// email</span>
          <span>// tipo · kind</span>
          <span>// rol · role</span>
          <span>// estado · status</span>
          <span />
        </div>

        {data.length === 0 && (
          <div className="gs-state" style={{ minHeight: 80 }}>
            <span
              className="mono"
              style={{ color: 'var(--eg-fg-3)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}
            >
              // sin personas · no users yet
            </span>
          </div>
        )}

        {data.map((u, i) => {
          const isInactive = u.isActive === false;
          const clientName = u.clientId ? (clientMap[u.clientId]?.name ?? u.clientId) : null;
          return (
            <div
              key={u.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1.4fr 1.6fr 110px 90px 90px auto',
                gap: 0,
                alignItems: 'center',
                padding: '10px 14px',
                borderBottom: i < data.length - 1 ? '1px dashed var(--eg-rule)' : 'none',
                background: isInactive
                  ? 'var(--eg-paper-3)'
                  : i % 2
                    ? 'var(--eg-paper)'
                    : 'var(--eg-paper-2)',
                opacity: isInactive ? 0.55 : 1,
              }}
            >
              {/* Avatar */}
              <Avatar
                name={u.name}
                seed={u.id}
                style={{ width: 30, height: 30, fontSize: 11 }}
              />

              {/* Name */}
              <div>
                <div
                  className="disp"
                  style={{ fontSize: 16, color: 'var(--eg-iron)', lineHeight: 1 }}
                >
                  {u.name}
                </div>
                {u.kind === 'client' && clientName && (
                  <div className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', marginTop: 2 }}>
                    {clientName}
                  </div>
                )}
              </div>

              {/* Email */}
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--eg-fg-2)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {u.email}
              </div>

              {/* Kind badge */}
              <span>
                <span
                  className="plate"
                  style={{
                    background: u.kind === 'staff' ? 'var(--eg-iron)' : 'var(--eg-gold)',
                    color: u.kind === 'staff' ? 'var(--eg-yellow)' : 'var(--eg-iron)',
                    fontSize: 9,
                    borderColor: 'var(--eg-iron)',
                  }}
                >
                  {u.kind}
                </span>
              </span>

              {/* Role — inline select for admins, plain text for others */}
              {isAdmin ? (
                <select
                  value={u.role}
                  disabled={updateMut.isPending}
                  onChange={(e) =>
                    updateMut.mutate({
                      id: u.id,
                      data: { role: e.currentTarget.value as UserRole },
                    })
                  }
                  style={{ ...SELECT_STYLE, fontSize: 11, padding: '3px 6px' }}
                >
                  <option value="admin">admin</option>
                  <option value="member">member</option>
                  <option value="viewer">viewer</option>
                </select>
              ) : (
                <span className="mono" style={{ fontSize: 11, color: 'var(--eg-fg-2)' }}>
                  {u.role}
                </span>
              )}

              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: isInactive ? 'var(--eg-rule)' : 'var(--eg-green)',
                    flexShrink: 0,
                  }}
                />
                <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)' }}>
                  {isInactive ? 'inact.' : 'activa'}
                </span>
              </div>

              {/* Actions — admin only */}
              {isAdmin ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  {/* Activate / Deactivate */}
                  <button
                    className="b-btn b-btn--ghost"
                    style={{ fontSize: 10, padding: '3px 6px' }}
                    disabled={updateMut.isPending}
                    onClick={() =>
                      updateMut.mutate({ id: u.id, data: { isActive: isInactive } })
                    }
                  >
                    {isInactive
                      ? 'Activar · Activate'
                      : 'Desact. · Deactivate'}
                  </button>
                  {/* Invite — only active users */}
                  {!isInactive && (
                    <button
                      className="b-btn b-btn--ghost"
                      style={{ fontSize: 10, padding: '3px 6px' }}
                      disabled={inviteMut.isPending}
                      onClick={() => inviteMut.mutate(u.id)}
                    >
                      Invitar · Invite
                    </button>
                  )}
                </div>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </section>

      {/* Add person button — admin only */}
      {isAdmin && !showCreate && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="b-btn b-btn--ink" onClick={() => setShowCreate(true)}>
            + Persona
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: Tab =
    rawTab === 'rates' ||
    rawTab === 'channels' ||
    rawTab === 'intake' ||
    rawTab === 'clients' ||
    rawTab === 'team'
      ? rawTab
      : 'clients';

  function setTab(t: Tab) {
    setSearchParams({ tab: t });
  }

  // Count queries for badge numbers
  const clientsQ = useQuery({ queryKey: ['clients'], queryFn: () => clients.list() });
  const ratesQ = useQuery({ queryKey: ['rates'], queryFn: () => rates.list() });
  const channelsQ = useQuery({ queryKey: ['channels'], queryFn: () => channels.list() });
  const intakeQ = useQuery({ queryKey: ['intake-sources'], queryFn: () => intake.sources.list() });
  const usersQ = useQuery({ queryKey: ['users', 'all'], queryFn: () => users.list(true) });

  return (
    <div className="body">
      <Subbar
        tabs={[
          {
            es: 'Clientes',
            en: 'Clients',
            count: clientsQ.data?.length ?? null,
            active: tab === 'clients',
            onClick: () => setTab('clients'),
          },
          {
            es: 'Tarifas',
            en: 'Rates',
            count: ratesQ.data?.length ?? null,
            active: tab === 'rates',
            onClick: () => setTab('rates'),
          },
          {
            es: 'Avisos',
            en: 'Channels',
            count: channelsQ.data?.length ?? null,
            active: tab === 'channels',
            onClick: () => setTab('channels'),
          },
          {
            es: 'Integraciones',
            en: 'Intake',
            count: intakeQ.data?.length ?? null,
            active: tab === 'intake',
            onClick: () => setTab('intake'),
          },
          {
            es: 'Equipo',
            en: 'Team',
            count: usersQ.data?.length ?? null,
            active: tab === 'team',
            onClick: () => setTab('team'),
          },
        ]}
        right={
          tab === 'clients' ? (
            undefined
          ) : tab === 'rates' ? (
            undefined
          ) : undefined
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
        {/* Section header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 24,
            alignItems: 'end',
            borderBottom: '2px solid var(--eg-iron)',
            paddingBottom: 8,
            marginBottom: 18,
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
              CLIENTES &amp; TARIFAS
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
              — CLIENTS &amp; RATES —
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
            SÓLO ADMIN · ADMIN ONLY · AUDITADO POR SAURON
            <br />
            AISLAMIENTO DE DATOS EN LA CAPA DE DATOS
          </div>
        </div>

        {tab === 'clients' && <ClientsTab />}
        {tab === 'rates' && <RatesTab />}
        {tab === 'channels' && <ChannelsTab />}
        {tab === 'intake' && <IntakeTab />}
        {tab === 'team' && <TeamTab />}
      </div>
    </div>
  );
}
