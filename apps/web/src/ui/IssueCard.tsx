// SPDX-License-Identifier: GPL-3.0-or-later
import type { IssueView } from '@gira/shared';
import { formatMoney } from '../lib/money';
import { Avatar, LabelChip, PriorityChip, TypeChip } from './atoms';

export function IssueCard({
  issue,
  ghost = false,
  dragging = false,
  onClick,
}: {
  issue: IssueView;
  ghost?: boolean;
  dragging?: boolean;
  onClick?: () => void;
}) {
  const emergency = issue.priority === 'emergency';
  const isFixed = issue.billingMode === 'fixed';
  const loggedH = Math.round(((issue.loggedMinutes ?? 0) / 60) * 10) / 10;

  return (
    <article
      className="gs-card"
      onClick={onClick}
      style={{
        background: 'var(--eg-paper)',
        border: '1.5px solid var(--eg-iron)',
        boxShadow: dragging ? '6px 6px 0 var(--eg-iron)' : '2px 2px 0 var(--eg-iron)',
        opacity: ghost ? 0.35 : 1,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        transform: dragging ? 'translate(-2px,-2px) rotate(-1deg)' : 'none',
        transition: 'transform 100ms, box-shadow 100ms',
      }}
    >
      {emergency && (
        <div
          style={{
            height: 6,
            background:
              'repeating-linear-gradient(-45deg, var(--eg-yellow) 0 8px, var(--eg-iron) 8px 16px)',
          }}
        />
      )}
      <div
        className="tag-head"
        style={{
          background: emergency ? 'var(--eg-red)' : 'var(--eg-paper-2)',
          color: emergency ? 'var(--eg-paper)' : 'var(--eg-fg-3)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TypeChip type={issue.type} />
          <b style={{ color: emergency ? 'var(--eg-paper)' : 'var(--eg-iron)', fontWeight: 700 }}>
            {issue.key}
          </b>
        </span>
        <span>
          {issue.storyPoints ? `${issue.storyPoints} pts` : '—'} · {loggedH}h
        </span>
      </div>

      <div style={{ padding: '10px 12px 12px' }}>
        <div
          className="disp"
          style={{
            fontSize: 15,
            lineHeight: 1.15,
            color: 'var(--eg-iron)',
            marginBottom: 8,
            textWrap: 'balance',
          }}
        >
          {issue.title}
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          <PriorityChip priority={issue.priority} />
          {issue.labels.map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
          {isFixed && issue.fixedPriceCents != null && (
            <span className="chip chip--ink">fixed · {formatMoney(issue.fixedPriceCents, 'EUR')}</span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px dashed var(--eg-iron)',
            paddingTop: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {issue.assignee ? (
              <>
                <Avatar user={issue.assignee} />
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--eg-fg-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {issue.assignee.name.split(' ')[0]}
                </span>
              </>
            ) : (
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--eg-fg-4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                sin asignar · unassigned
              </span>
            )}
          </div>
          {issue.estimateMinutes != null && issue.estimateMinutes > 0 && (
            <span
              className="mono"
              style={{ fontSize: 10, color: 'var(--eg-fg-3)', letterSpacing: '0.1em' }}
            >
              EST {Math.round((issue.estimateMinutes / 60) * 10) / 10}h
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
