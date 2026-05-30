// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { incidents, projects } from '../../api/client';
import { useMe, useLogout } from '../../hooks/useAuth';
import { Avatar, EyeGlyph, Glyph } from '../../ui/atoms';

export function TopBar() {
  const navigate = useNavigate();
  const { key } = useParams();
  const me = useMe();
  const logout = useLogout();
  const projectList = useQuery({ queryKey: ['projects'], queryFn: () => projects.list() });
  const openIncidents = useQuery({
    queryKey: ['incidents', 'open'],
    queryFn: () => incidents.list('open'),
    refetchInterval: 60_000,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');

  const current = projectList.data?.find((p) => p.key === key);
  const notifyCount = openIncidents.data?.length ?? 0;

  function runSearch() {
    const term = q.trim();
    if (!term || !key) return;
    navigate(`/projects/${key}/backlog?q=${encodeURIComponent(term)}`);
  }

  return (
    <div className="topbar">
      <button
        type="button"
        className="topbar__brand"
        onClick={() => navigate('/projects')}
        style={{ cursor: 'pointer', border: 0 }}
      >
        <Glyph />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span>gira-scrumlord</span>
          <span className="sub">v0.1.0 · M1</span>
        </div>
      </button>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="topbar__project"
          onClick={() => setMenuOpen((v) => !v)}
          style={{ border: 0, background: 'none', height: '100%' }}
        >
          <span className="pk">{key ?? '—'}</span>
          <span>{current?.name ?? (key ? key : 'Selecciona proyecto · Pick a project')}</span>
          <span className="chev">▾</span>
        </button>
        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              zIndex: 60,
              minWidth: 300,
              background: 'var(--eg-paper)',
              border: '2px solid var(--eg-iron)',
              boxShadow: '4px 4px 0 var(--eg-iron)',
            }}
            onMouseLeave={() => setMenuOpen(false)}
          >
            {(projectList.data ?? []).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate(`/projects/${p.key}/board`);
                }}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 12px',
                  border: 0,
                  borderBottom: '1px solid var(--eg-rule)',
                  background: p.key === key ? 'var(--eg-yellow)' : 'var(--eg-paper)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  className="mono"
                  style={{ fontWeight: 700, fontSize: 11, color: 'var(--eg-iron)', letterSpacing: '0.1em' }}
                >
                  {p.key}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: 'uppercase',
                    color: 'var(--eg-iron)',
                  }}
                >
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="topbar__search">
        <span className="mono" style={{ fontSize: 11, color: 'var(--eg-fg-4)' }}>
          //
        </span>
        <input
          placeholder="Buscar  ·  Search issues, comments, worklogs…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch();
          }}
        />
        <span className="kbd">⏎</span>
      </div>

      <div className="topbar__right">
        <div className="topbar__btn lore" data-lore="scrumlord · daemon · pg-boss · 4 jobs">
          <span style={{ width: 6, height: 6, background: 'var(--eg-green)', borderRadius: '50%' }} />
          <span>scrumlord</span>
          <span style={{ color: 'var(--eg-fg-5)' }}>RUN</span>
        </div>
        <button
          type="button"
          className="topbar__btn lore"
          data-lore="sauron · audit log · port :666"
          onClick={() => navigate('/audit')}
          style={{ border: 0, background: 'none' }}
        >
          <span style={{ color: 'var(--eg-yellow)' }}>
            <EyeGlyph />
          </span>
          <span>:666</span>
        </button>
        <button
          type="button"
          className="topbar__btn"
          onClick={() => navigate('/incidents')}
          style={{ border: 0, background: 'none' }}
        >
          <span>Avisos · Notify</span>
          {notifyCount > 0 && <span className="num">{notifyCount}</span>}
        </button>
        <button
          type="button"
          className="topbar__btn"
          onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
          style={{ background: 'var(--eg-yellow)', color: 'var(--eg-iron)', border: 0 }}
          title="Cerrar sesión · Log out"
        >
          {me.data && <Avatar user={me.data} />}
          <span>{me.data?.name?.split(' ')[0] ?? '—'}</span>
        </button>
      </div>
    </div>
  );
}
