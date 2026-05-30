// SPDX-License-Identifier: GPL-3.0-or-later
// Landing page for the link emailed to a user's NEW address. It posts the token to
// the API, which switches the email + revokes all sessions — so on success we send
// the user to sign in again with their new address.
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { auth, ApiError } from '../api/client';
import { Glyph } from '../ui/atoms';

export function EmailChangeConfirmPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'pending' | 'ok' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard React 18 StrictMode double-invoke (token is single-use)
    ran.current = true;
    if (!token) {
      setState('error');
      setMessage('Enlace inválido · invalid link');
      return;
    }
    auth
      .confirmEmailChange(token)
      .then((r) => {
        setState('ok');
        setMessage(r.email);
      })
      .catch((e) => {
        setState('error');
        setMessage((e as ApiError)?.message ?? 'No se pudo confirmar · could not confirm');
      });
  }, [token]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--eg-iron)',
        padding: 24,
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          background: 'var(--eg-paper)',
          border: '2px solid var(--eg-iron)',
          borderLeft: '12px solid var(--eg-yellow)',
          boxShadow: '6px 6px 0 rgba(0,0,0,0.4)',
          padding: '40px 36px',
          maxWidth: 460,
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, background: 'var(--eg-yellow)', border: '2px solid var(--eg-iron)', display: 'grid', placeItems: 'center' }}>
            <Glyph />
          </div>
          <span className="caps" style={{ color: 'var(--eg-fg-3)' }}>
            // cambio de correo · email change
          </span>
        </div>

        {state === 'pending' && (
          <div className="mono" style={{ fontSize: 14, color: 'var(--eg-iron)' }}>
            Confirmando… · confirming…
          </div>
        )}

        {state === 'ok' && (
          <>
            <h1 className="disp" style={{ fontSize: 30, color: 'var(--eg-iron)', margin: '0 0 10px', lineHeight: 1.05 }}>
              Correo actualizado.
            </h1>
            <p className="mono" style={{ fontSize: 13, color: 'var(--eg-fg-2)', lineHeight: 1.6 }}>
              Tu cuenta usa ahora <strong>{message}</strong>. Por seguridad cerramos las sesiones
              abiertas · for security all sessions were closed. Inicia sesión de nuevo.
            </p>
            <Link to="/login" className="btn btn--yellow" style={{ marginTop: 22, display: 'inline-flex' }}>
              Iniciar sesión · Sign in →
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className="disp" style={{ fontSize: 30, color: 'var(--eg-red)', margin: '0 0 10px', lineHeight: 1.05 }}>
              No se pudo confirmar.
            </h1>
            <p className="mono" style={{ fontSize: 13, color: 'var(--eg-fg-2)', lineHeight: 1.6 }}>
              {message}. El enlace pudo caducar o ya se usó · the link may have expired or been used.
            </p>
            <Link to="/login" className="b-btn" style={{ marginTop: 22, display: 'inline-flex' }}>
              ← Volver · Back
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
