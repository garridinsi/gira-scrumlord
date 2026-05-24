// SPDX-License-Identifier: GPL-3.0-or-later
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console in development; a real setup would forward to Sauron / Sentry.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--eg-paper)',
            padding: 32,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              border: '2px solid var(--eg-iron)',
              boxShadow: '6px 6px 0 var(--eg-iron)',
            }}
          >
            {/* Hazard stripe header */}
            <div
              style={{
                height: 16,
                background:
                  'repeating-linear-gradient(-45deg, var(--eg-yellow) 0 10px, var(--eg-iron) 10px 20px)',
              }}
            />

            {/* Iron body */}
            <div
              style={{
                background: 'var(--eg-iron)',
                color: 'var(--eg-paper)',
                padding: '20px 24px 14px',
              }}
            >
              <div
                className="disp"
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                  color: 'var(--eg-yellow)',
                }}
              >
                ALGO SE ROMPIÓ
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  color: 'var(--eg-fg-4)',
                  marginTop: 4,
                  textTransform: 'uppercase',
                }}
              >
                SOMETHING BROKE
              </div>
            </div>

            {/* Error detail */}
            <div
              style={{
                background: 'var(--eg-paper-2)',
                padding: '16px 24px',
                borderTop: '1.5px solid var(--eg-iron)',
              }}
            >
              <div className="caps" style={{ marginBottom: 8 }}>
                // mensaje de error · error message
              </div>
              <pre
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--eg-red)',
                  background: 'var(--eg-paper)',
                  border: '1.5px solid var(--eg-iron)',
                  padding: '10px 14px',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.6,
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </pre>
            </div>

            {/* Action footer */}
            <div
              style={{
                background: 'var(--eg-paper)',
                borderTop: '2px solid var(--eg-iron)',
                padding: '14px 24px',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                className="b-btn b-btn--ink"
                onClick={() => window.location.reload()}
              >
                ↻ Recargar · Reload
              </button>
              <button
                type="button"
                className="b-btn b-btn--ghost"
                onClick={() => this.setState({ error: null })}
              >
                Reintentar · Retry
              </button>
              <span
                className="mono"
                style={{
                  marginLeft: 'auto',
                  fontSize: 10,
                  color: 'var(--eg-fg-4)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                gira-scrumlord · runtime fault
              </span>
            </div>

            {/* Hazard stripe footer */}
            <div
              style={{
                height: 8,
                background:
                  'repeating-linear-gradient(-45deg, var(--eg-yellow) 0 6px, var(--eg-iron) 6px 12px)',
              }}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
