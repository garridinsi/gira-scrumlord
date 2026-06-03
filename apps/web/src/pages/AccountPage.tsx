// SPDX-License-Identifier: GPL-3.0-or-later
// Self-service account page. Rendered under both the staff shell (/account) and the
// client portal (/portal/account) — same surface, both personas edit their own
// name + UI language, change their email (verified), and manage active sessions.
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserLocale } from '@gira/shared';
import { auth, ApiError } from '../api/client';
import { useMe } from '../hooks/useAuth';

const LOCALES: { value: UserLocale; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'both', label: 'Ambos · Both' },
];

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador · Admin',
  member: 'Miembro · Member',
  viewer: 'Lectura · Viewer',
};

function Card({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: 'var(--eg-paper)',
        border: '2px solid var(--eg-iron)',
        boxShadow: '4px 4px 0 var(--eg-iron)',
        padding: 24,
        marginBottom: 22,
      }}
    >
      <div className="caps" style={{ color: 'var(--eg-fg-3)', marginBottom: 4 }}>
        // {title}
      </div>
      {sub && (
        <div className="mono" style={{ fontSize: 11, color: 'var(--eg-fg-4)', marginBottom: 16 }}>
          {sub}
        </div>
      )}
      <div style={{ marginTop: sub ? 0 : 12 }}>{children}</div>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
  background: 'var(--eg-paper)',
  border: '2px solid var(--eg-iron)',
  padding: '10px 12px',
  width: '100%',
  boxShadow: '2px 2px 0 var(--eg-iron)',
};

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 6 };

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: '8px 0',
        borderBottom: '1px dashed var(--eg-rule)',
      }}
    >
      <span className="caps" style={{ color: 'var(--eg-fg-4)' }}>
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 13,
          color: 'var(--eg-iron)',
          textAlign: 'right',
          minWidth: 0,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function AccountPage() {
  const me = useMe();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [locale, setLocale] = useState<UserLocale>('es');
  const [newEmail, setNewEmail] = useState('');

  // Seed local form state once the user loads.
  useEffect(() => {
    if (me.data) {
      setName(me.data.name);
      setLocale(me.data.locale);
    }
  }, [me.data]);

  const saveProfile = useMutation({
    mutationFn: () => auth.updateMe({ name: name.trim(), locale }),
    onSuccess: (user) => qc.setQueryData(['auth', 'me'], user),
  });

  const sessionsQ = useQuery({ queryKey: ['auth', 'sessions'], queryFn: () => auth.sessions() });
  const revokeOthers = useMutation({
    mutationFn: () => auth.revokeOtherSessions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth', 'sessions'] }),
  });

  const requestEmail = useMutation({
    mutationFn: () => auth.requestEmailChange(newEmail.trim()),
    onSuccess: () => setNewEmail(''),
  });

  if (me.isLoading)
    return (
      <div className="mono" style={{ padding: 32 }}>
        cargando · loading…
      </div>
    );
  if (!me.data) return null;
  const u = me.data;

  const dirty = name.trim() !== u.name || locale !== u.locale;

  return (
    // Scroll container: the staff shell is height:100dvh / overflow:hidden, so without
    // its own overflow this page's content was clipped below the fold on short screens.
    <div
      style={{ height: '100%', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
          padding: '32px 24px 64px',
          boxSizing: 'border-box',
        }}
      >
        <h1
          className="disp"
          style={{
            fontSize: 44,
            color: 'var(--eg-iron)',
            margin: '0 0 4px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
          }}
        >
          MI CUENTA
        </h1>
        <div
          className="mono"
          style={{
            fontSize: 12,
            color: 'var(--eg-fg-3)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 28,
          }}
        >
          — MY ACCOUNT —
        </div>

        <Card title="perfil · profile">
          <label className="caps" htmlFor="acct-name" style={labelStyle}>
            nombre · name
          </label>
          <input
            id="acct-name"
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />

          <label className="caps" htmlFor="acct-locale" style={{ ...labelStyle, marginTop: 16 }}>
            idioma · language
          </label>
          <select
            id="acct-locale"
            style={inputStyle}
            value={locale}
            onChange={(e) => setLocale(e.target.value as UserLocale)}
          >
            {LOCALES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>

          <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn--yellow"
              disabled={!dirty || !name.trim() || saveProfile.isPending}
              onClick={() => saveProfile.mutate()}
            >
              {saveProfile.isPending ? 'Guardando…' : 'Guardar · Save'}
            </button>
            {saveProfile.isSuccess && !dirty && (
              <span className="mono" style={{ fontSize: 12, color: 'var(--eg-green, #2a7)' }}>
                ✓ guardado · saved
              </span>
            )}
            {saveProfile.isError && (
              <span className="mono" style={{ fontSize: 12, color: 'var(--eg-red)' }}>
                {(saveProfile.error as ApiError)?.message ?? 'error'}
              </span>
            )}
          </div>
        </Card>

        <Card
          title="identidad · identity"
          sub="El correo es tu identidad de acceso · email is your login identity"
        >
          <ReadOnlyRow label="correo · email" value={u.email} />
          <ReadOnlyRow label="rol · role" value={ROLE_LABEL[u.role] ?? u.role} />
          <ReadOnlyRow
            label="tipo · kind"
            value={u.kind === 'client' ? 'Cliente · Client' : 'Equipo · Staff'}
          />

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '2px solid var(--eg-iron)' }}>
            <div className="caps" style={{ color: 'var(--eg-fg-3)', marginBottom: 8 }}>
              // cambiar correo · change email
            </div>
            <p
              className="mono"
              style={{ fontSize: 11, color: 'var(--eg-fg-4)', marginBottom: 10, lineHeight: 1.5 }}
            >
              Enviaremos un enlace al NUEVO correo. El cambio solo se aplica al confirmarlo · we
              email the NEW address; the switch happens only when you confirm it.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
              <input
                type="email"
                aria-label="Nuevo correo · New email"
                placeholder="nuevo@correo…"
                style={{ ...inputStyle, flex: 1, minWidth: 220 }}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <button
                type="button"
                className="b-btn"
                disabled={!newEmail.trim() || requestEmail.isPending}
                onClick={() => requestEmail.mutate()}
              >
                {requestEmail.isPending ? 'Enviando…' : 'Enviar enlace · Send link'}
              </button>
            </div>
            {requestEmail.isSuccess && (
              <div
                className="mono"
                style={{ fontSize: 12, color: 'var(--eg-green, #2a7)', marginTop: 10 }}
              >
                ✓ Revisa el nuevo correo para confirmar · check the new inbox to confirm.
              </div>
            )}
            {requestEmail.isError && (
              <div className="mono" style={{ fontSize: 12, color: 'var(--eg-red)', marginTop: 10 }}>
                {(requestEmail.error as ApiError)?.message ?? 'error'}
              </div>
            )}
          </div>
        </Card>

        <Card
          title="sesiones activas · active sessions"
          sub="Dispositivos con sesión abierta · devices currently signed in"
        >
          {sessionsQ.isLoading && (
            <div className="mono" style={{ fontSize: 12 }}>
              cargando…
            </div>
          )}
          {(sessionsQ.data ?? []).map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px dashed var(--eg-rule)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 12,
                    color: 'var(--eg-iron)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.userAgent ?? 'dispositivo desconocido · unknown device'}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-4)' }}>
                  {s.ip ?? '—'} ·{' '}
                  {s.lastSeenAt
                    ? `visto ${new Date(s.lastSeenAt).toLocaleString('es-ES')}`
                    : `desde ${new Date(s.createdAt).toLocaleDateString('es-ES')}`}
                </div>
              </div>
              {s.current && (
                <span
                  className="caps"
                  style={{
                    color: 'var(--eg-iron)',
                    background: 'var(--eg-yellow)',
                    padding: '2px 8px',
                    height: 'fit-content',
                  }}
                >
                  actual · current
                </span>
              )}
            </div>
          ))}
          {(sessionsQ.data?.length ?? 0) > 1 && (
            <button
              type="button"
              className="b-btn"
              style={{ marginTop: 16 }}
              disabled={revokeOthers.isPending}
              onClick={() => revokeOthers.mutate()}
            >
              {revokeOthers.isPending ? '…' : 'Cerrar las demás sesiones · Log out everywhere else'}
            </button>
          )}
          {revokeOthers.isSuccess && (
            <span
              className="mono"
              style={{ fontSize: 12, color: 'var(--eg-green, #2a7)', marginLeft: 12 }}
            >
              ✓ {revokeOthers.data.revoked} cerradas · revoked
            </span>
          )}
        </Card>
      </div>
    </div>
  );
}
