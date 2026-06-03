// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * FilterBar — issue search + filter bar with saved views.
 *
 * Accepts a projectKey, calls issues.list() with the active filter combo,
 * and returns the filtered result via onResults(). Saved views are stored in
 * localStorage keyed by projectKey.
 *
 * Bilingual: ES primary, EN secondary throughout.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { IssueView, LabelView, UserView } from '@gira/shared';
import { issues as issuesApi, projects, users as usersApi } from '../api/client';
import { LabelChip } from './atoms';
import { downloadCsv } from '../lib/csv';

function exportIssuesCsv(projectKey: string, list: IssueView[]): void {
  downloadCsv(`${projectKey}-incidencias`, [
    [
      'Key',
      'Título · Title',
      'Tipo · Type',
      'Prioridad · Priority',
      'Estado · Status',
      'Asignado · Assignee',
      'Puntos · Points',
      'Vence · Due',
    ],
    ...list.map((i) => [
      i.key,
      i.title,
      i.type,
      i.priority,
      i.statusName ?? '',
      i.assignee?.name ?? '',
      i.storyPoints ?? '',
      i.dueAt ? i.dueAt.slice(0, 10) : '',
    ]),
  ]);
}

// ── Saved-view types ──────────────────────────────────────────────────────────

export interface FilterState {
  q: string;
  assigneeId: string | null;
  type: string | null;
  priority: string | null;
  labelId: string | null;
}

const EMPTY_FILTER: FilterState = {
  q: '',
  assigneeId: null,
  type: null,
  priority: null,
  labelId: null,
};

interface SavedView {
  id: string;
  name: string;
  filter: FilterState;
}

const BUILTIN_VIEWS = (myId: string): SavedView[] => [
  {
    id: '__mine',
    name: 'Asignadas a mí · Assigned to me',
    filter: { ...EMPTY_FILTER, assigneeId: myId },
  },
  {
    id: '__high',
    name: 'Prioridad alta · High priority',
    filter: { ...EMPTY_FILTER, priority: 'high' },
  },
  {
    id: '__urgent',
    name: 'Urgentes · Urgent',
    filter: { ...EMPTY_FILTER, priority: 'urgent' },
  },
];

function storageKey(projectKey: string) {
  return `gira_saved_views_${projectKey}`;
}

function loadSavedViews(projectKey: string): SavedView[] {
  try {
    const raw = localStorage.getItem(storageKey(projectKey));
    if (!raw) return [];
    return JSON.parse(raw) as SavedView[];
  } catch {
    return [];
  }
}

function saveSavedViews(projectKey: string, views: SavedView[]): void {
  try {
    localStorage.setItem(storageKey(projectKey), JSON.stringify(views));
  } catch {
    // localStorage not available — silently ignore
  }
}

// ── Helper: is filter empty? ──────────────────────────────────────────────────

function isFilterEmpty(f: FilterState): boolean {
  return !f.q && !f.assigneeId && !f.type && !f.priority && !f.labelId;
}

function filtersEqual(a: FilterState, b: FilterState): boolean {
  return (
    a.q === b.q &&
    a.assigneeId === b.assigneeId &&
    a.type === b.type &&
    a.priority === b.priority &&
    a.labelId === b.labelId
  );
}

// ── FilterBar component ───────────────────────────────────────────────────────

interface FilterBarProps {
  projectKey: string;
  myId: string | null;
  onResults: (issues: IssueView[] | null) => void; // null = no filter active (caller shows full list)
}

export function FilterBar({ projectKey, myId, onResults }: FilterBarProps) {
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => loadSavedViews(projectKey));
  const [saveViewName, setSaveViewName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedFilter, setDebouncedFilter] = useState<FilterState>(EMPTY_FILTER);

  // Reset if project changes
  useEffect(() => {
    setFilter(EMPTY_FILTER);
    setDebouncedFilter(EMPTY_FILTER);
    setSavedViews(loadSavedViews(projectKey));
    setShowSaveInput(false);
  }, [projectKey]);

  // Debounce the text search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedFilter(filter);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filter]);

  // Labels and users for dropdowns
  const labelsQ = useQuery({
    queryKey: ['labels', projectKey],
    queryFn: () => projects.labels.list(projectKey),
    enabled: !!projectKey,
    staleTime: 60_000,
  });

  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    staleTime: 60_000,
  });

  const labels: LabelView[] = labelsQ.data ?? [];
  const userList: UserView[] = usersQ.data ?? [];

  // Derived: whether any filter is active
  const filterActive = !isFilterEmpty(debouncedFilter);

  // Run the API query when filters are set
  const filteredQ = useQuery({
    queryKey: ['issues', 'filter', projectKey, debouncedFilter],
    queryFn: () =>
      issuesApi.list({
        projectKey,
        q: debouncedFilter.q || undefined,
        assigneeId: debouncedFilter.assigneeId ?? undefined,
        type:
          (debouncedFilter.type as Parameters<typeof issuesApi.list>[0] extends { type?: infer T }
            ? T
            : never) ?? undefined,
        priority:
          (debouncedFilter.priority as Parameters<typeof issuesApi.list>[0] extends {
            priority?: infer T;
          }
            ? T
            : never) ?? undefined,
        labelId: debouncedFilter.labelId ?? undefined,
      }),
    enabled: filterActive && !!projectKey,
    staleTime: 15_000,
  });

  // Push results to parent
  useEffect(() => {
    if (!filterActive) {
      onResults(null);
      return;
    }
    if (filteredQ.data) {
      onResults(filteredQ.data);
    }
  }, [filterActive, filteredQ.data, onResults]);

  const clearAll = useCallback(() => {
    setFilter(EMPTY_FILTER);
    setDebouncedFilter(EMPTY_FILTER);
  }, []);

  const applyView = useCallback((view: SavedView) => {
    setFilter(view.filter);
    setDebouncedFilter(view.filter);
    setShowSaveInput(false);
  }, []);

  const saveCurrentView = () => {
    const name = saveViewName.trim();
    if (!name) return;
    const newView: SavedView = { id: `user_${Date.now()}`, name, filter };
    const updated = [...savedViews, newView];
    setSavedViews(updated);
    saveSavedViews(projectKey, updated);
    setSaveViewName('');
    setShowSaveInput(false);
  };

  const deleteView = (id: string) => {
    const updated = savedViews.filter((v) => v.id !== id);
    setSavedViews(updated);
    saveSavedViews(projectKey, updated);
  };

  const builtins = myId ? BUILTIN_VIEWS(myId) : [];
  const allViews = [...builtins, ...savedViews];
  const activeViewId = allViews.find((v) => filtersEqual(v.filter, filter))?.id ?? null;

  const inputStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: '1.5px solid var(--eg-iron)',
    background: 'var(--eg-paper)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--eg-iron)',
    height: 28,
  };

  return (
    <div
      style={{
        background: 'var(--eg-paper-2)',
        borderBottom: '2px solid var(--eg-iron)',
        padding: '8px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        flexShrink: 0,
      }}
    >
      {/* First row: search + dropdowns + clear */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Text search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span
            className="mono"
            style={{
              position: 'absolute',
              left: 8,
              fontSize: 10,
              color: 'var(--eg-fg-4)',
              pointerEvents: 'none',
            }}
          >
            //
          </span>
          <input
            type="search"
            value={filter.q}
            onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
            placeholder="Buscar · Search"
            style={{ ...inputStyle, paddingLeft: 28, width: 220 }}
            aria-label="Buscar tickets · Search issues"
          />
        </div>

        {/* Assignee */}
        <select
          value={filter.assigneeId ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, assigneeId: e.target.value || null }))}
          style={{ ...inputStyle, minWidth: 130 }}
          aria-label="Filtrar por asignado · Filter by assignee"
        >
          <option value="">Asignado · Assignee</option>
          {userList.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        {/* Type */}
        <select
          value={filter.type ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value || null }))}
          style={{ ...inputStyle, minWidth: 100 }}
          aria-label="Filtrar por tipo · Filter by type"
        >
          <option value="">Tipo · Type</option>
          {(['task', 'bug', 'story', 'epic'] as const).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Priority */}
        <select
          value={filter.priority ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, priority: e.target.value || null }))}
          style={{ ...inputStyle, minWidth: 120 }}
          aria-label="Filtrar por prioridad · Filter by priority"
        >
          <option value="">Prioridad · Priority</option>
          {(['low', 'medium', 'high', 'urgent', 'emergency'] as const).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Label */}
        <select
          value={filter.labelId ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, labelId: e.target.value || null }))}
          style={{ ...inputStyle, minWidth: 130 }}
          aria-label="Filtrar por etiqueta · Filter by label"
        >
          <option value="">Etiqueta · Label</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        {/* Loading indicator */}
        {filterActive && filteredQ.isFetching && (
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--eg-fg-4)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            ···
          </span>
        )}

        {/* Clear all */}
        {filterActive && (
          <button
            type="button"
            className="b-btn b-btn--ghost"
            style={{ fontSize: 10, padding: '2px 8px', height: 28 }}
            onClick={clearAll}
          >
            ✕ Limpiar · Clear
          </button>
        )}

        {/* Save view */}
        {filterActive && !showSaveInput && (
          <button
            type="button"
            className="b-btn"
            style={{ fontSize: 10, padding: '2px 8px', height: 28 }}
            onClick={() => setShowSaveInput(true)}
          >
            + Guardar vista · Save view
          </button>
        )}

        {/* Export current results */}
        {filterActive && (filteredQ.data?.length ?? 0) > 0 && (
          <button
            type="button"
            className="b-btn b-btn--ghost"
            style={{ fontSize: 10, padding: '2px 8px', height: 28 }}
            onClick={() => exportIssuesCsv(projectKey, filteredQ.data ?? [])}
          >
            CSV
          </button>
        )}
        {showSaveInput && (
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              autoFocus
              type="text"
              value={saveViewName}
              onChange={(e) => setSaveViewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveCurrentView();
                if (e.key === 'Escape') setShowSaveInput(false);
              }}
              placeholder="Nombre de vista · View name"
              style={{ ...inputStyle, width: 180 }}
            />
            <button
              type="button"
              className="b-btn b-btn--ink"
              style={{ fontSize: 10, padding: '2px 8px', height: 28 }}
              disabled={!saveViewName.trim()}
              onClick={saveCurrentView}
            >
              OK
            </button>
            <button
              type="button"
              className="b-btn b-btn--ghost"
              style={{ fontSize: 10, padding: '2px 6px', height: 28 }}
              onClick={() => setShowSaveInput(false)}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Second row: active chips + saved views */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Active filter chips */}
        {filter.q && (
          <ActiveChip label={`"${filter.q}"`} onClear={() => setFilter((f) => ({ ...f, q: '' }))} />
        )}
        {filter.assigneeId && (
          <ActiveChip
            label={userList.find((u) => u.id === filter.assigneeId)?.name ?? filter.assigneeId}
            onClear={() => setFilter((f) => ({ ...f, assigneeId: null }))}
          />
        )}
        {filter.type && (
          <ActiveChip
            label={filter.type}
            onClear={() => setFilter((f) => ({ ...f, type: null }))}
          />
        )}
        {filter.priority && (
          <ActiveChip
            label={filter.priority}
            onClear={() => setFilter((f) => ({ ...f, priority: null }))}
          />
        )}
        {filter.labelId && labels.find((l) => l.id === filter.labelId) && (
          <LabelChipWithClear
            label={labels.find((l) => l.id === filter.labelId)!}
            onClear={() => setFilter((f) => ({ ...f, labelId: null }))}
          />
        )}

        {/* Divider */}
        {filterActive && allViews.length > 0 && (
          <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-4)', margin: '0 4px' }}>
            |
          </span>
        )}

        {/* Saved view pills */}
        {allViews.map((view) => (
          <ViewPill
            key={view.id}
            view={view}
            active={activeViewId === view.id}
            isBuiltin={view.id.startsWith('__')}
            onApply={() => applyView(view)}
            onDelete={() => deleteView(view.id)}
          />
        ))}

        {/* Result count when active */}
        {filterActive && filteredQ.data && (
          <span
            className="mono"
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              color: 'var(--eg-fg-3)',
              letterSpacing: '0.1em',
            }}
          >
            {filteredQ.data.length} resultado{filteredQ.data.length !== 1 ? 's' : ''} · result
            {filteredQ.data.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        background: 'var(--eg-yellow)',
        border: '1px solid var(--eg-iron)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--eg-iron)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {label}
      <button
        type="button"
        onClick={onClear}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 11,
          lineHeight: 1,
          padding: 0,
          color: 'var(--eg-iron)',
          fontWeight: 700,
        }}
      >
        ×
      </button>
    </span>
  );
}

function LabelChipWithClear({ label, onClear }: { label: LabelView; onClear: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <LabelChip label={label} />
      <button
        type="button"
        onClick={onClear}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 11,
          padding: '0 2px',
          color: 'var(--eg-iron)',
          fontWeight: 700,
        }}
      >
        ×
      </button>
    </span>
  );
}

function ViewPill({
  view,
  active,
  isBuiltin,
  onApply,
  onDelete,
}: {
  view: SavedView;
  active: boolean;
  isBuiltin: boolean;
  onApply: () => void;
  onDelete: () => void;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0,
        background: active ? 'var(--eg-iron)' : 'var(--eg-paper)',
        border: '1.5px solid var(--eg-iron)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.06em',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onApply}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 7px',
          color: active ? 'var(--eg-yellow)' : 'var(--eg-iron)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: active ? 700 : 400,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {view.name}
      </button>
      {!isBuiltin && (
        <button
          type="button"
          onClick={onDelete}
          style={{
            background: active ? 'var(--eg-iron-2)' : 'var(--eg-paper-2)',
            border: 'none',
            borderLeft: '1px solid var(--eg-iron)',
            cursor: 'pointer',
            padding: '2px 5px',
            color: active ? 'var(--eg-fg-4)' : 'var(--eg-fg-3)',
            fontSize: 11,
            lineHeight: 1,
          }}
          title="Eliminar vista · Delete view"
        >
          ×
        </button>
      )}
    </span>
  );
}
