// SPDX-License-Identifier: GPL-3.0-or-later
// E1: the in-app inbox surfaced as a TopBar bell — unread badge + a dropdown of the
// caller's personal notifications, with mark-read. Mounted in the staff shell, so issue
// links resolve to /issues/:key. Closes on Escape / outside-click (a11y).
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { InboxItemView } from '@gira/shared';
import { inbox } from '../api/client';

function label(n: InboxItemView): string {
  const key = typeof n.payload.issueKey === 'string' ? n.payload.issueKey : '';
  if (n.type === 'issue.assigned') return `${key} · asignada a ti · assigned to you`;
  if (n.type === 'issue.status_changed') return `${key} · estado cambiado · status changed`;
  if (n.type === 'issue.emergency') return `${key} · emergencia · emergency`;
  if (n.type === 'mention') {
    const who = typeof n.payload.actorName === 'string' ? n.payload.actorName : 'Alguien';
    return `${key} · ${who} te mencionó · mentioned you`;
  }
  return key ? `${key} · ${n.type}` : n.type;
}

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const countQ = useQuery({
    queryKey: ['inbox', 'unread'],
    queryFn: () => inbox.unreadCount(),
    refetchInterval: 60_000,
  });
  const listQ = useQuery({
    queryKey: ['inbox', 'list'],
    queryFn: () => inbox.list(),
    enabled: open,
  });
  const unread = countQ.data?.unread ?? 0;
  const items = listQ.data ?? [];

  const markAll = useMutation({
    mutationFn: () => inbox.markAllRead(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inbox'] }),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => inbox.markRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inbox'] }),
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="b-btn b-btn--ghost"
        aria-label={`Notificaciones · notifications${unread ? ` (${unread} sin leer · unread)` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ position: 'relative' }}
      >
        <span aria-hidden="true">🔔</span>
        {unread > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: 'var(--eg-red)',
              color: '#fff',
              borderRadius: 9,
              fontSize: 10,
              minWidth: 16,
              height: 16,
              lineHeight: '16px',
              textAlign: 'center',
              padding: '0 3px',
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Notificaciones · notifications"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 6,
            width: 320,
            maxHeight: 420,
            overflow: 'auto',
            background: 'var(--eg-paper)',
            border: '2px solid var(--eg-iron)',
            boxShadow: '4px 4px 0 var(--eg-iron)',
            zIndex: 50,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 10px',
              borderBottom: '1.5px solid var(--eg-rule)',
            }}
          >
            <span className="caps" style={{ fontSize: 11 }}>
              // BANDEJA · INBOX
            </span>
            {unread > 0 && (
              <button
                type="button"
                className="b-btn b-btn--ghost"
                style={{ fontSize: 11 }}
                onClick={() => markAll.mutate()}
              >
                marcar leído · mark read
              </button>
            )}
          </div>
          {items.length === 0 && (
            <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--eg-fg-3)' }}>
              Sin notificaciones · no notifications
            </div>
          )}
          {items.map((n) => {
            const key = typeof n.payload.issueKey === 'string' ? n.payload.issueKey : null;
            const row = (
              <div
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--eg-rule)',
                  background: n.readAt ? 'transparent' : 'var(--eg-yellow-soft)',
                  fontSize: 12,
                }}
              >
                {label(n)}
              </div>
            );
            return key ? (
              <Link
                key={n.id}
                to={`/issues/${key}`}
                role="menuitem"
                style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
                onClick={() => {
                  if (!n.readAt) markOne.mutate(n.id);
                  setOpen(false);
                }}
              >
                {row}
              </Link>
            ) : (
              <div key={n.id} role="menuitem">
                {row}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
