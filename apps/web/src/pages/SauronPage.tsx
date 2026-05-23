// SPDX-License-Identifier: GPL-3.0-or-later
// Sauron — the audit log. ":666 · watching". Read-only, no mutations.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { audit } from '../api/client';
import type { AuditEntry } from '../api/client';
import { Subbar } from '../ui/Subbar';
import { EyeGlyph } from '../ui/atoms';
import { formatRelativeTime, formatDate } from '../lib/format';

// ── Helpers ───────────────────────────────────────────────────────────────────

function actorInitials(entry: AuditEntry): string {
  if (!entry.actor) return '??';
  const parts = entry.actor.name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/** Extract changed keys from before/after for a compact diff note. */
function diffNote(before: unknown, after: unknown): string {
  if (!before && !after) return '—';
  if (!before) return '+new';
  if (!after) return '-deleted';
  if (typeof before !== 'object' || typeof after !== 'object') return '~changed';
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const changed: string[] = [];
  for (const k of allKeys) {
    if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) changed.push(k);
  }
  if (changed.length === 0) return '—';
  return changed.slice(0, 3).map((k) => `~${k}`).join(', ') + (changed.length > 3 ? ` +${changed.length - 3}` : '');
}

function actionParts(action: string): [string, string] {
  const dot = action.indexOf('.');
  if (dot === -1) return [action, ''];
  return [action.slice(0, dot), action.slice(dot)];
}

/** Known action types to display as filter pills. */
const KNOWN_ACTIONS = [
  'ALL',
  'issue.move',
  'issue.create',
  'issue.update',
  'worklog.create',
  'comment.create',
  'rate.update',
  'timer.start',
  'timer.reap',
  'session.start',
  'sprint.autoclose',
  'outbox.dispatch',
] as const;

// ── Eye glyph — the full Sauron eye as in the design ─────────────────────────

function SauronEye() {
  return (
    <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: '2.5px solid var(--eg-yellow)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--eg-red) 0%, var(--eg-iron) 70%)',
        }}
      />
      {/* Vertical iris slit */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 6,
          height: 36,
          background: 'var(--eg-iron)',
          transform: 'translate(-50%, -50%)',
          borderRadius: 3,
        }}
      />
      {/* Pupil ring */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 16,
          height: 36,
          border: '1.5px solid var(--eg-yellow)',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}

// ── Audit row ─────────────────────────────────────────────────────────────────

function AuditRow({ entry, i }: { entry: AuditEntry; i: number }) {
  const isDaemon = entry.actorId === null;
  const [entityType, entityTail] = actionParts(entry.action);
  const diff = diffNote(entry.before, entry.after);
  const isFirst = i === 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '140px 70px 220px 1fr 200px',
        gap: 0,
        padding: '10px 24px',
        borderBottom: '1px solid var(--eg-iron-2)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--eg-paper)',
        alignItems: 'center',
        background: isFirst ? 'rgba(245,196,0,0.06)' : 'transparent',
      }}
    >
      {/* Time */}
      <span
        style={{
          color: 'var(--eg-fg-5)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {isFirst && (
          <span
            style={{
              width: 6,
              height: 6,
              background: 'var(--eg-yellow)',
              display: 'inline-block',
              borderRadius: '50%',
              animation: 'blink 1.4s steps(2) infinite',
              flexShrink: 0,
            }}
          />
        )}
        <span title={formatDate(entry.at)}>{formatRelativeTime(entry.at)}</span>
      </span>

      {/* Actor */}
      <span>
        {isDaemon ? (
          <span
            className="lore"
            data-lore="scrumlord · pg-boss worker"
            style={{
              background: 'var(--eg-red)',
              color: 'var(--eg-paper)',
              padding: '1px 6px',
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: '0.1em',
            }}
          >
            DAEMON
          </span>
        ) : (
          <span style={{ color: 'var(--eg-yellow)', fontWeight: 700 }}>
            {actorInitials(entry)}
          </span>
        )}
      </span>

      {/* Action · Entity */}
      <span>
        <span style={{ color: 'var(--eg-yellow)' }}>{entityType}</span>
        <span style={{ color: 'var(--eg-fg-5)' }}>{entityTail}</span>
        <span style={{ color: 'var(--eg-fg-5)', margin: '0 6px' }}>·</span>
        <span style={{ color: 'var(--eg-paper)' }}>{entry.entityId}</span>
        <span style={{ color: 'var(--eg-fg-5)', marginLeft: 4, fontSize: 10 }}>
          [{entry.entityType}]
        </span>
      </span>

      {/* Note */}
      <span style={{ color: 'var(--eg-fg-5)' }}>
        {isDaemon && (
          <span style={{ color: 'var(--eg-fg-4)', marginRight: 6 }}>scrumlord ·</span>
        )}
        {!isDaemon && entry.actor && (
          <span style={{ color: 'var(--eg-fg-4)', marginRight: 6 }}>
            {entry.actor.name} ·
          </span>
        )}
        {entry.entityType} {entry.entityId}
      </span>

      {/* Diff */}
      <span
        style={{
          color: diff.startsWith('+') ? 'var(--eg-green)' : diff.startsWith('-') ? 'var(--eg-red)' : 'var(--eg-fg-5)',
        }}
      >
        {diff}
      </span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function SauronPage() {
  const [actionFilter, setActionFilter] = useState('ALL');

  const auditQ = useQuery({
    queryKey: ['audit', actionFilter],
    queryFn: () =>
      audit.list({
        limit: 100,
        ...(actionFilter !== 'ALL' ? { action: actionFilter } : {}),
      }),
    refetchInterval: 30_000, // refresh every 30 s — it's a live tail
  });

  const entries: AuditEntry[] = auditQ.data?.entries ?? [];
  const count = auditQ.data?.count ?? 0;

  // Derive unique actions from loaded data for filter pills
  const seenActions = new Set(entries.map((e) => e.action));
  const filterActions = [
    'ALL',
    ...KNOWN_ACTIONS.filter((a) => a !== 'ALL' && seenActions.has(a)),
    ...[...seenActions].filter(
      (a) => !(KNOWN_ACTIONS as readonly string[]).includes(a),
    ),
  ];

  return (
    <div
      className="body"
      style={{ background: 'var(--eg-iron)', color: 'var(--eg-paper)' }}
    >
      <Subbar
        tabs={[
          {
            es: 'En Vivo',
            en: 'Live Tail',
            count: count,
            active: true,
          },
        ]}
        right={
          <>
            <span className="f-pill" style={{ background: 'var(--eg-iron-2)', color: 'var(--eg-paper)', borderColor: 'var(--eg-iron-3)' }}>
              ENTIDAD <b>cualquiera</b>
            </span>
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--eg-fg-5)',
                letterSpacing: '0.12em',
                padding: '0 8px',
              }}
            >
              // :666 · sólo lectura · read-only
            </span>
          </>
        }
      />

      {/* Hero strip */}
      <div
        style={{
          background: 'var(--eg-iron)',
          borderBottom: '2px solid var(--eg-yellow)',
          padding: '16px 24px',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto auto',
          gap: 24,
          alignItems: 'center',
        }}
      >
        {/* Eye + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SauronEye />
          <div>
            <div className="caps" style={{ color: 'var(--eg-yellow)' }}>
              // packages/sauron
            </div>
            <h1
              className="disp"
              style={{
                fontSize: 46,
                color: 'var(--eg-paper)',
                margin: 0,
                lineHeight: 0.9,
                fontWeight: 900,
                letterSpacing: '-0.02em',
              }}
            >
              SAURON · AUDITORÍA
            </h1>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--eg-fg-5)',
                letterSpacing: '0.14em',
                marginTop: 4,
                textTransform: 'uppercase',
              }}
            >
              — AUDIT —
            </div>
          </div>
        </div>

        {/* Lore */}
        <div
          style={{
            paddingLeft: 24,
            borderLeft: '1px dashed var(--eg-yellow)',
          }}
        >
          <div
            style={{
              fontStyle: 'italic',
              color: 'var(--eg-fg-5)',
              fontSize: 14,
              lineHeight: 1.45,
              maxWidth: 460,
            }}
          >
            "Sólo observa." ·{' '}
            <span style={{ color: 'var(--eg-fg-4)' }}>"it only watches."</span>
            <br />
            <span style={{ fontSize: 12, color: 'var(--eg-fg-4)' }}>
              append-only · API de sólo lectura · proceso separado
            </span>
          </div>
        </div>

        {/* Port */}
        <div>
          <div className="caps" style={{ color: 'var(--eg-fg-5)' }}>
            // puerto · port
          </div>
          <div
            className="disp"
            style={{
              fontSize: 56,
              color: 'var(--eg-yellow)',
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
            }}
          >
            :666
          </div>
        </div>

        {/* Status */}
        <div style={{ textAlign: 'right' }}>
          <div className="caps" style={{ color: 'var(--eg-fg-5)' }}>
            // estado · status
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'flex-end',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                background: auditQ.isError ? 'var(--eg-red)' : 'var(--eg-green)',
                display: 'inline-block',
                borderRadius: '50%',
              }}
            />
            <span
              className="disp"
              style={{ fontSize: 28, color: 'var(--eg-paper)', lineHeight: 1 }}
            >
              {auditQ.isError ? 'ERROR' : 'VIGILANDO'}
            </span>
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--eg-fg-5)',
              letterSpacing: '0.1em',
              marginTop: 6,
            }}
          >
            WATCHING · {count} FILAS · <EyeGlyph size={10} />
          </div>
        </div>
      </div>

      {/* Filter strip */}
      <div
        style={{
          background: 'var(--eg-iron-2)',
          borderBottom: '1px solid var(--eg-iron-3)',
          padding: '8px 24px',
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span className="caps" style={{ color: 'var(--eg-fg-5)', marginRight: 8 }}>
          // acción · action ·
        </span>
        {filterActions.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setActionFilter(a)}
            style={{
              padding: '3px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              background: actionFilter === a ? 'var(--eg-yellow)' : 'transparent',
              color: actionFilter === a ? 'var(--eg-iron)' : 'var(--eg-paper)',
              border: `1px solid ${actionFilter === a ? 'var(--eg-yellow)' : 'var(--eg-iron-3)'}`,
              fontWeight: actionFilter === a ? 700 : 500,
            }}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Log body */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          background: 'var(--eg-iron)',
        }}
      >
        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '140px 70px 220px 1fr 200px',
            gap: 0,
            padding: '6px 24px',
            background: 'var(--eg-iron-2)',
            borderBottom: '1px solid var(--eg-iron-3)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--eg-fg-5)',
          }}
        >
          <span>// fecha · at</span>
          <span>// actor</span>
          <span>// acción · entidad</span>
          <span>// nota · note</span>
          <span>// diff</span>
        </div>

        {/* Loading */}
        {auditQ.isLoading && (
          <div className="gs-state" style={{ background: 'var(--eg-iron)' }}>
            <span className="gs-loading" style={{ color: 'var(--eg-fg-5)' }}>
              cargando auditoría · loading audit
            </span>
          </div>
        )}

        {/* Error */}
        {auditQ.isError && (
          <div className="gs-state" style={{ background: 'var(--eg-iron)' }}>
            <span
              className="mono"
              style={{ color: 'var(--eg-red)', fontSize: 12, letterSpacing: '0.12em' }}
            >
              // error al cargar auditoría · failed to load
            </span>
          </div>
        )}

        {/* Empty */}
        {!auditQ.isLoading && !auditQ.isError && entries.length === 0 && (
          <div className="gs-state" style={{ background: 'var(--eg-iron)', flexDirection: 'column', gap: 16 }}>
            <EyeGlyph size={32} />
            <div>
              <div
                className="mono"
                style={{
                  color: 'var(--eg-fg-5)',
                  fontSize: 12,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                // sin eventos · no events
              </div>
              <div
                className="mono"
                style={{ color: 'var(--eg-fg-4)', fontSize: 11, fontStyle: 'italic' }}
              >
                "the eye only watches — nothing to report."
              </div>
            </div>
          </div>
        )}

        {/* Rows */}
        {entries.map((entry, i) => (
          <AuditRow key={entry.id} entry={entry} i={i} />
        ))}

        {/* Footer cmdline */}
        {entries.length > 0 && (
          <div
            style={{
              padding: '14px 24px 22px',
              color: 'var(--eg-fg-5)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
            }}
          >
            <span style={{ color: 'var(--eg-yellow)' }}>sauron $</span>{' '}
            tail -f /audit --limit=100
            {actionFilter !== 'ALL' ? ` --action=${actionFilter}` : ''}
            <br />
            <span style={{ color: 'var(--eg-fg-4)' }}>
              // {entries.length} filas · streaming ·{' '}
              {auditQ.dataUpdatedAt > 0
                ? `último refresco ${formatRelativeTime(new Date(auditQ.dataUpdatedAt).toISOString())}`
                : 'cargando · loading'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
