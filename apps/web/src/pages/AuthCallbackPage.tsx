// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '../api/client';

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = params.get('token');
  const ran = useRef(false);

  const exchange = useMutation({
    mutationFn: (t: string) => auth.callback(t),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user);
      navigate('/projects', { replace: true });
    },
  });

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (token) exchange.mutate(token);
  }, [token, exchange]);

  const failed = !token || exchange.isError;

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'var(--eg-iron)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}
    >
      <div
        style={{
          background: 'var(--eg-paper)',
          border: '2px solid var(--eg-iron)',
          boxShadow: '6px 6px 0 var(--eg-yellow)',
          padding: 0,
          maxWidth: 460,
          width: '100%',
        }}
      >
        <div
          style={{
            height: 14,
            background:
              'repeating-linear-gradient(-45deg, var(--eg-yellow) 0 14px, var(--eg-iron) 14px 28px)',
          }}
        />
        <div style={{ padding: '28px 32px' }}>
          <span className="plate" style={{ marginBottom: 16 }}>
            ACCESO · BOARDING
          </span>
          {failed ? (
            <>
              <h2
                className="disp"
                style={{ fontSize: 34, color: 'var(--eg-red)', margin: '0 0 8px', lineHeight: 1 }}
              >
                ENLACE INVÁLIDO
              </h2>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--eg-fg-3)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: 14,
                }}
              >
                — INVALID OR EXPIRED LINK —
              </div>
              <p style={{ color: 'var(--eg-fg-2)', marginBottom: 18 }}>
                El enlace ha caducado o ya se usó (un solo uso, 15 min). Pide uno nuevo.
              </p>
              <Link to="/login" className="btn btn--yellow" style={{ textDecoration: 'none' }}>
                ← Volver a entrar · Back to login
              </Link>
            </>
          ) : (
            <>
              <h2
                className="disp"
                style={{ fontSize: 34, color: 'var(--eg-iron)', margin: '0 0 8px', lineHeight: 1 }}
              >
                ENTRANDO…
              </h2>
              <div className="gs-loading">validando enlace · validating link</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
