// SPDX-License-Identifier: GPL-3.0-or-later
// Transient notifications — iron box, hi-vis stripe, bottom-right, ~4s.
// Ported from the Parts Depot (GS-LIB-V03). "If it needs more time, it's an Alert."
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type ToastTone = 'ok' | 'warn' | 'danger';
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
}
interface PushToast {
  (t: { tone?: ToastTone; title: string; body?: string }): void;
}

const ToastCtx = createContext<PushToast>(() => {});

export function useToast(): PushToast {
  return useContext(ToastCtx);
}

const STRIPE: Record<ToastTone, string> = {
  ok: 'var(--eg-green)',
  warn: 'var(--eg-yellow)',
  danger: 'var(--eg-red)',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => setItems((s) => s.filter((x) => x.id !== id)), []);

  const push = useCallback<PushToast>(
    (t) => {
      const id = Date.now() + Math.random();
      setItems((s) => [...s, { id, tone: t.tone ?? 'ok', title: t.title, body: t.body }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {items.map((t) => (
          <div
            key={t.id}
            // A danger toast is an error the user must notice → assertive 'alert';
            // ok/warn stay polite 'status' so they don't interrupt the screen reader.
            role={t.tone === 'danger' ? 'alert' : 'status'}
            style={{
              width: 360,
              background: 'var(--eg-iron)',
              color: 'var(--eg-paper)',
              border: '2px solid var(--eg-iron)',
              boxShadow: '4px 4px 0 var(--eg-paper-3)',
              display: 'grid',
              gridTemplateColumns: '8px 1fr auto',
            }}
          >
            <div style={{ background: STRIPE[t.tone] }} />
            <div style={{ padding: '10px 14px' }}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--eg-yellow)',
                  textTransform: 'uppercase',
                }}
              >
                // {t.title}
              </div>
              {t.body && (
                <div style={{ fontSize: 12, color: 'var(--eg-paper)', marginTop: 3 }}>{t.body}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => remove(t.id)}
              style={{
                background: 'transparent',
                border: 0,
                color: 'var(--eg-fg-5)',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                padding: '10px 12px',
              }}
              aria-label="cerrar"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
