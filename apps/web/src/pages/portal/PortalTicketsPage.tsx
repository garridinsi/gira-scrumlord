// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { issues } from '../../api/client';
import { IssueCard } from '../../ui/IssueCard';
import type { IssueView, StatusCategory } from '@gira/shared';

interface StatusGroup {
  category: StatusCategory;
  es: string;
  en: string;
  issues: IssueView[];
}

export function PortalTicketsPage() {
  const navigate = useNavigate();
  const [projectFilter, setProjectFilter] = useState<string>('');

  const issuesQ = useQuery({
    queryKey: ['portal', 'issues'],
    queryFn: () => issues.list(),
    staleTime: 30_000,
  });

  if (issuesQ.isLoading) {
    return (
      <div className="gs-state">
        <span className="gs-loading">cargando tickets · loading issues</span>
      </div>
    );
  }

  if (issuesQ.isError) {
    return (
      <div className="gs-state">
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--eg-fg-3)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              background: 'var(--eg-red)',
              color: 'var(--eg-paper)',
              padding: '6px 14px',
              fontWeight: 700,
              display: 'inline-block',
              marginBottom: 12,
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Error · Error
          </div>
          <p style={{ margin: 0 }}>
            {issuesQ.error instanceof Error
              ? issuesQ.error.message
              : 'No se pudieron cargar los tickets · Could not load issues'}
          </p>
        </div>
      </div>
    );
  }

  const allIssues = issuesQ.data ?? [];

  // Collect distinct project keys for the filter
  const projectKeys = [...new Set(allIssues.map((i) => i.projectKey))].sort();

  // Apply project filter
  const filtered = projectFilter
    ? allIssues.filter((i) => i.projectKey === projectFilter)
    : allIssues;

  // Group by statusCategory (todo → Abierto, in_progress → En curso, done → Hecho)
  const groups: StatusGroup[] = [
    {
      category: 'in_progress',
      es: 'En curso',
      en: 'In progress',
      issues: filtered.filter((i) => i.statusCategory === 'in_progress'),
    },
    {
      category: 'todo',
      es: 'Abierto',
      en: 'Open',
      issues: filtered.filter((i) => i.statusCategory === 'todo' || !i.statusCategory),
    },
    {
      category: 'done',
      es: 'Hecho',
      en: 'Done',
      issues: filtered.filter((i) => i.statusCategory === 'done'),
    },
  ];

  const totalVisible = filtered.length;

  return (
    <div className="cp-page cp-page--wide">
      {/* ── Page header ─────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
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
          // portal · client portal
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(28px, 5vw, 48px)',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            color: 'var(--eg-iron)',
            margin: 0,
            lineHeight: 1,
          }}
        >
          Tickets
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-stencil)',
            fontWeight: 700,
            fontSize: 14,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--eg-fg-3)',
            margin: '4px 0 0',
          }}
        >
          Todas las incidencias · All issues
        </p>
      </div>

      {/* ── Project filter ───────────────────────────── */}
      {projectKeys.length > 1 && (
        <div className="cp-filter-bar">
          <span className="cp-filter-bar__label">Proyecto · Project</span>
          <button
            type="button"
            className={'cp-filter-pill' + (!projectFilter ? ' cp-filter-pill--active' : '')}
            onClick={() => setProjectFilter('')}
          >
            Todos · All ({allIssues.length})
          </button>
          {projectKeys.map((key) => (
            <button
              key={key}
              type="button"
              className={
                'cp-filter-pill' + (projectFilter === key ? ' cp-filter-pill--active' : '')
              }
              onClick={() => setProjectFilter(projectFilter === key ? '' : key)}
            >
              {key} ({allIssues.filter((i) => i.projectKey === key).length})
            </button>
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────── */}
      {totalVisible === 0 && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--eg-fg-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            padding: '60px 0',
            textAlign: 'center',
          }}
        >
          Sin tickets · No issues yet
        </div>
      )}

      {/* ── Status groups ────────────────────────────── */}
      {groups
        .filter((g) => g.issues.length > 0)
        .map((group) => (
          <div key={group.category} className="cp-issue-group">
            <div className="cp-section-head">
              <h2 className="cp-section-head__label">{group.es}</h2>
              <span className="cp-section-head__sub">{group.en}</span>
              <span className="cp-section-head__ct">{group.issues.length}</span>
            </div>

            <div className="cp-issue-list">
              {group.issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onClick={() => navigate(`/portal/issues/${issue.key}`)}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
