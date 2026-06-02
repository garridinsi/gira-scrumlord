// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { auth } from '../api/client';
import { useMe } from '../hooks/useAuth';
import { Glyph } from '../ui/atoms';

export function LoginPage() {
  const me = useMe();
  const [email, setEmail] = useState('');
  const sendLink = useMutation({ mutationFn: (e: string) => auth.magicLink(e) });

  if (me.data) return <Navigate to="/projects" replace />;

  const sent = sendLink.isSuccess;

  return (
    <div
      className="eg-login"
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'var(--eg-iron)',
        display: 'grid',
        gridTemplateColumns: '1fr 580px',
        fontFamily: 'var(--font-body)',
        color: 'var(--eg-paper)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left poster */}
      <div
        className="eg-login__poster"
        style={{
          position: 'relative',
          padding: 56,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: 'var(--eg-yellow)',
              border: '3px solid var(--eg-paper)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Glyph />
          </div>
          <div>
            <div className="disp" style={{ fontSize: 22, color: 'var(--eg-paper)', lineHeight: 1 }}>
              gira-scrumlord
            </div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--eg-yellow)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginTop: 4,
              }}
            >
              mantenedor · maintainer
            </div>
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--eg-yellow)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            // gestión de incidencias · autoalojable · gpl-3.0
          </div>
          <h1
            className="disp"
            style={{ fontSize: 110, color: 'var(--eg-paper)', lineHeight: 0.82, margin: 0, fontWeight: 900, letterSpacing: '-0.03em' }}
          >
            CONSTRUIDO.
            <br />
            <span style={{ background: 'var(--eg-yellow)', color: 'var(--eg-iron)', padding: '0 0.08em' }}>REGISTRADO.</span>
            <br />
            <span style={{ color: 'var(--eg-red)' }}>COBRADO.</span>
          </h1>
          <div
            className="mono"
            style={{ fontSize: 12, color: 'var(--eg-fg-5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 16 }}
          >
            — BUILT · TRACKED · PAID —
          </div>

          <div style={{ marginTop: 32, display: 'flex', gap: 0, maxWidth: 520, border: '2px solid var(--eg-yellow)' }}>
            {[
              { es: 'tablero', en: 'board' },
              { es: 'tiempos', en: 'timesheet' },
              { es: 'facturas', en: 'invoices' },
              { es: 'mantenedor', en: 'for makers' },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  padding: '12px 12px',
                  borderRight: i < 3 ? '2px solid var(--eg-yellow)' : 'none',
                  background: i === 3 ? 'var(--eg-yellow)' : 'transparent',
                }}
              >
                <div className="caps" style={{ color: i === 3 ? 'var(--eg-iron)' : 'var(--eg-fg-5)' }}>
                  // 0{i + 1}
                </div>
                <div
                  className="disp"
                  style={{ fontSize: 20, color: i === 3 ? 'var(--eg-iron)' : 'var(--eg-paper)', lineHeight: 1, marginTop: 4 }}
                >
                  {s.es.toUpperCase()}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: i === 3 ? 'var(--eg-iron)' : 'var(--eg-fg-5)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginTop: 4,
                  }}
                >
                  {s.en}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              height: 14,
              background: 'repeating-linear-gradient(-45deg, var(--eg-yellow) 0 14px, var(--eg-iron) 14px 28px)',
              marginBottom: 14,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--eg-fg-5)', textTransform: 'uppercase' }}>
              // software libre · GPL-3.0
              <br />
              // sin telemetría · sin terceros
            </div>
            <div
              className="mono"
              style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--eg-yellow)', textTransform: 'uppercase', textAlign: 'right' }}
            >
              ◉ acceso restringido
              <br />
              ◉ restricted access
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: -100,
            top: 280,
            fontFamily: 'var(--font-stencil)',
            fontSize: 280,
            fontWeight: 900,
            color: 'var(--eg-iron-2)',
            lineHeight: 0.9,
            transform: 'rotate(-90deg)',
            transformOrigin: 'right top',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          GIRA · SCRUMLORD
        </div>
      </div>

      {/* Right login card */}
      <div
        className="eg-login__card"
        style={{
          background: 'var(--eg-paper)',
          borderLeft: '12px solid var(--eg-yellow)',
          padding: '80px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: 'var(--eg-iron)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: 0,
            bottom: 0,
            width: 14,
            backgroundImage: 'radial-gradient(circle at 7px 10px, var(--eg-iron) 1.5px, transparent 2px)',
            backgroundSize: '14px 20px',
          }}
        />

        <span className="plate" style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
          BOARDING · PASS · ACCESO
        </span>

        <h2 className="disp" style={{ fontSize: 60, color: 'var(--eg-iron)', lineHeight: 0.9, margin: '0 0 6px', fontWeight: 900, letterSpacing: '-0.02em' }}>
          ACCEDE.
          <br />
          SIN CONTRASEÑA.
        </h2>
        <div className="mono" style={{ fontSize: 11, color: 'var(--eg-fg-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 22 }}>
          — SIGN IN · NO PASSWORD —
        </div>

        <p style={{ fontSize: 15, color: 'var(--eg-fg-2)', marginBottom: 28, maxWidth: 400, lineHeight: 1.5 }}>
          Te enviamos un enlace de acceso de un solo uso a tu correo.{' '}
          <span style={{ color: 'var(--eg-fg-3)' }}>We&rsquo;ll email you a one-time sign-in link.</span>
        </p>

        {!sent ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) sendLink.mutate(email.trim());
            }}
          >
            <label className="caps" htmlFor="login-email" style={{ display: 'block', marginBottom: 6 }}>
              // CORREO · EMAIL
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.eus"
              aria-label="Correo electrónico · Email"
              autoFocus
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                background: 'var(--eg-paper)',
                border: '2px solid var(--eg-iron)',
                padding: '12px 14px',
                width: '100%',
                boxShadow: '3px 3px 0 var(--eg-iron)',
              }}
            />

            <button
              type="submit"
              className="btn btn--yellow"
              disabled={sendLink.isPending}
              style={{ marginTop: 22, width: '100%', justifyContent: 'center' }}
            >
              {sendLink.isPending ? 'Enviando…' : 'Envíame el enlace · Mail me the link →'}
            </button>

            {sendLink.isError && (
              // Generic, non-enumerating: a transport/CORS/5xx failure must not leave the
              // app's sole entry point silently reverting with no feedback. This says
              // nothing about whether the account exists.
              <div
                role="alert"
                className="mono"
                style={{
                  marginTop: 16,
                  padding: '10px 12px',
                  border: '2px solid var(--eg-red)',
                  background: 'var(--eg-red)',
                  color: 'var(--eg-paper)',
                  fontSize: 12,
                  lineHeight: 1.5,
                  boxShadow: '3px 3px 0 var(--eg-iron)',
                }}
              >
                No pudimos enviar el enlace ahora mismo. Inténtalo de nuevo.{' '}
                <span style={{ opacity: 0.85 }}>Couldn&rsquo;t send the link right now — please try again.</span>
              </div>
            )}
          </form>
        ) : (
          <div style={{ border: '2px solid var(--eg-iron)', background: 'var(--eg-yellow)', padding: 18, boxShadow: '4px 4px 0 var(--eg-iron)' }}>
            <div className="caps" style={{ color: 'var(--eg-iron)' }}>
              // REVISA TU BANDEJA · CHECK YOUR INBOX
            </div>
            <div className="disp" style={{ fontSize: 28, color: 'var(--eg-iron)', lineHeight: 1.05, marginTop: 6 }}>
              Enviado. Si conocemos{' '}
              <span style={{ background: 'var(--eg-iron)', color: 'var(--eg-yellow)', padding: '0 6px' }}>{email}</span>, el enlace está en camino.
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--eg-iron)', marginTop: 12, letterSpacing: '0.08em' }}>
              // expira en 15 minutos · un solo uso
              {import.meta.env.DEV && (
                <>
                  <br />
                  // en desarrollo, el enlace aparece en Mailpit · :8025
                </>
              )}
            </div>
            <button
              onClick={() => sendLink.reset()}
              className="b-btn"
              style={{ marginTop: 14, background: 'var(--eg-iron)', color: 'var(--eg-yellow)' }}
            >
              ← Otro correo
            </button>
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 36, borderTop: '1px solid var(--eg-iron)', display: 'flex', justifyContent: 'space-between' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            autoalojable · self-hosted · GPL-3.0
          </span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--eg-fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            sin analítica · sin tracking
          </span>
        </div>
      </div>
    </div>
  );
}
