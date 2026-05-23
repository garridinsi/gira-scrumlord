// SPDX-License-Identifier: GPL-3.0-or-later
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projects } from '../api/client';
import { Subbar } from '../ui/Subbar';

export function ProjectsPage() {
  const list = useQuery({ queryKey: ['projects'], queryFn: () => projects.list() });

  return (
    <div className="body">
      <Subbar tabs={[{ es: 'Proyectos', en: 'Projects', active: true, count: list.data?.length ?? null }]} />
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--eg-paper)' }}>
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
        {list.data && list.data.length === 0 && (
          <div className="gs-state">
            <span className="mono" style={{ color: 'var(--eg-fg-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              // sin proyectos · no projects yet
            </span>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {(list.data ?? []).map((p) => (
            <Link
              key={p.key}
              to={`/projects/${p.key}/board`}
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
          ))}
        </div>
      </div>
    </div>
  );
}
