// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { incidents, projects } from '../../api/client';
import { useMe, useLogout } from '../../hooks/useAuth';
import { Avatar, EyeGlyph, Glyph } from '../../ui/atoms';

export function TopBar({ onMenuClick }: { onMenuClick?: () => void } = {}) {
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
  const [acctOpen, setAcctOpen] = useState(false);
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
        className="topbar__menu"
        onClick={() => onMenuClick?.()}
        aria-label="Menú · Menu"
        title="Menú · Menu"
      >
        <span className="topbar__menu-bars" aria-hidden="true">
          ☰
        </span>
      </button>
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

      <div className="topbar__projectwrap" style={{ position: 'relative' }}>
        <button
          type="button"
          className="topbar__project"
          onClick={() => setMenuOpen((v) => !v)}
          style={{ border: 0, background: 'none', height: '100%' }}
        >
          <span className="pk">{key ?? '—'}</span>
          <span className="topbar__projectname">{current?.name ?? (key ? key : 'Selecciona proyecto · Pick a project')}</span>
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
          className="topbar__btn topbar__avisos"
          onClick={() => navigate('/incidents')}
          style={{ border: 0, background: 'none' }}
          aria-label="Avisos · Notify"
        >
          <span className="topbar__btntext">Avisos · Notify</span>
          {notifyCount > 0 && <span className="num">{notifyCount}</span>}
        </button>
        <div className="topbar__acctwrap" style={{ position: 'relative' }}>
          <button
            type="button"
            className="topbar__btn"
            onClick={() => setAcctOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={acctOpen}
            style={{ background: 'var(--eg-yellow)', color: 'var(--eg-iron)', border: 0 }}
            title="Mi cuenta · My account"
          >
            {me.data && <Avatar user={me.data} />}
            <span className="topbar__btntext">{me.data?.name?.split(' ')[0] ?? '—'}</span>
            <span className="chev">▾</span>
          </button>
          {acctOpen && (
            <div
              role="menu"
              onMouseLeave={() => setAcctOpen(false)}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                zIndex: 60,
                minWidth: 200,
                background: 'var(--eg-paper)',
                border: '2px solid var(--eg-iron)',
                boxShadow: '4px 4px 0 var(--eg-iron)',
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAcctOpen(false);
                  navigate('/account');
                }}
                style={menuItemStyle}
              >
                Mi cuenta · My account
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
                style={{ ...menuItemStyle, borderBottom: 0, color: 'var(--eg-red)' }}
              >
                Cerrar sesión · Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 14px',
  border: 0,
  borderBottom: '1px solid var(--eg-rule)',
  background: 'var(--eg-paper)',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--eg-iron)',
};
