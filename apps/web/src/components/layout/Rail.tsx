// SPDX-License-Identifier: GPL-3.0-or-later
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projects, system } from '../../api/client';
import { Bi } from '../../ui/atoms';

interface RailItem {
  id: string;
  es: string;
  en: string;
  to?: string;
  num?: string;
  lore?: string;
}

export function Rail() {
  const { key } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const board = useQuery({
    queryKey: ['board', key],
    queryFn: () => projects.board(key!),
    enabled: !!key,
  });
  const backlog = useQuery({
    queryKey: ['backlog', key],
    queryFn: () => projects.backlog(key!),
    enabled: !!key,
  });
  const sprints = useQuery({
    queryKey: ['sprints', key],
    queryFn: () => projects.sprints.list(key!),
    enabled: !!key,
  });
  const health = useQuery({ queryKey: ['health'], queryFn: () => system.health(), refetchInterval: 30_000 });

  const boardTotal = board.data?.columns.reduce((n, c) => n + c.issues.length, 0);
  const p = key ? `/projects/${key}` : '';

  const projectItems: RailItem[] = [
    { id: 'board', es: 'Tablero', en: 'Board', to: `${p}/board`, num: boardTotal != null ? String(boardTotal) : '' },
    { id: 'backlog', es: 'Pendientes', en: 'Backlog', to: `${p}/backlog`, num: backlog.data ? String(backlog.data.length) : '' },
    { id: 'sprints', es: 'Sprints', en: 'Sprints', to: `${p}/sprints`, num: sprints.data ? String(sprints.data.length) : '' },
    { id: 'summary', es: 'Resumen', en: 'Summary', to: `${p}` },
  ];
  const loreItems: RailItem[] = [
    { id: 'audit', es: 'Auditoría', en: 'Sauron · Audit', to: '/audit', num: ':666' },
    { id: 'scrumlord', es: 'Daemon', en: 'Scrumlord', lore: 'pg-boss · 4 jobs queued', num: '4' },
  ];
  const adminItems: RailItem[] = [
    { id: 'rates', es: 'Tarifas', en: 'Rates', to: '/settings?tab=rates' },
    { id: 'clients', es: 'Clientes', en: 'Clients', to: '/settings?tab=clients' },
    { id: 'settings', es: 'Ajustes', en: 'Settings', to: '/settings' },
  ];

  const isActive = (it: RailItem) => {
    if (!it.to) return false;
    const base = it.to.split('?')[0]!;
    if (it.id === 'summary') return pathname === base;
    if (base === '/settings') return pathname === '/settings';
    return pathname.startsWith(base);
  };

  const renderItem = (it: RailItem) => (
    <button
      key={it.id}
      type="button"
      className={'rail__item' + (isActive(it) ? ' active' : '') + (it.lore ? ' lore' : '')}
      data-lore={it.lore}
      onClick={() => it.to && navigate(it.to)}
      disabled={!it.to}
      style={{
        alignItems: 'flex-start',
        paddingTop: 8,
        paddingBottom: 8,
        border: 0,
        borderLeft: isActive(it) ? '3px solid var(--eg-iron)' : '3px solid transparent',
        width: '100%',
        background: isActive(it) ? 'var(--eg-yellow)' : 'transparent',
        cursor: it.to ? 'pointer' : 'help',
        textAlign: 'left',
      }}
    >
      <span
        className="ico"
        style={{
          background: 'var(--eg-iron)',
          clipPath:
            it.id === 'board'
              ? 'polygon(0 0, 100% 0, 100% 70%, 0 70%, 0 100%, 50% 100%, 50% 30%, 100% 30%)'
              : 'none',
          opacity: isActive(it) ? 1 : 0.7,
          marginTop: 4,
        }}
      />
      <Bi es={it.es} en={it.en} size="tiny" />
      {it.num && (
        <span className="num" style={{ marginTop: 4 }}>
          {it.num}
        </span>
      )}
    </button>
  );

  const ok = health.data?.status === 'ok';

  return (
    <aside className="rail">
      <div className="rail__section">
        <div className="rail__head">
          <span>// project</span>
          <span style={{ color: 'var(--eg-iron)', fontWeight: 700 }}>{key ?? '—'}</span>
        </div>
        {projectItems.map(renderItem)}
      </div>

      <div className="rail__section">
        <div className="rail__head">
          <span>// lore, in code</span>
        </div>
        {loreItems.map(renderItem)}
      </div>

      <div className="rail__section">
        <div className="rail__head">
          <span>// admin</span>
        </div>
        {adminItems.map(renderItem)}
      </div>

      <div className="rail__foot">
        <div className="row">
          <span>
            <span className={'dot' + (ok ? '' : ' red')} />
            &nbsp; api
          </span>
          <span style={{ color: 'var(--eg-fg-1)' }}>{ok ? 'OK' : '…'}</span>
        </div>
        <div className="row">
          <span>
            <span className={'dot' + (health.data?.db ? '' : ' red')} />
            &nbsp; db
          </span>
          <span style={{ color: 'var(--eg-fg-1)' }}>{health.data?.db ? 'pg16 · up' : '…'}</span>
        </div>
        <div className="row">
          <span>
            <span className="dot yellow" />
            &nbsp; pg-boss
          </span>
          <span style={{ color: 'var(--eg-fg-1)' }}>scrumlord</span>
        </div>
        <div className="row">
          <span>
            <span className="dot" />
            &nbsp; sauron
          </span>
          <span style={{ color: 'var(--eg-fg-1)' }}>:666</span>
        </div>
      </div>
    </aside>
  );
}
