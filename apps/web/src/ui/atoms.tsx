// SPDX-License-Identifier: GPL-3.0-or-later
// Shared design-system atoms, ported from the EG "Mantenedor" handoff.
import type { CSSProperties, ReactNode } from 'react';
import type { IssueType, LabelView, Priority, UserView } from '@gira/shared';

// ── Bilingual stack · ES primary, EN mono below ──────────────────────────
type BiSize = 'big' | 'tiny';
type BiTone = 'ink' | 'yellow';

export function Bi({
  es,
  en,
  size,
  tone,
  inline,
  className = '',
  style,
}: {
  es: ReactNode;
  en: ReactNode;
  size?: BiSize;
  tone?: BiTone;
  inline?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const cls = [
    'bi',
    inline ? 'bi--inline' : '',
    size ? `bi--${size}` : '',
    tone ? `bi--on-${tone}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={cls} style={style}>
      <span className="bi__es">{es}</span>
      <span className="bi__en">{en}</span>
    </span>
  );
}

// ── Glyphs ────────────────────────────────────────────────────────────────
export function Glyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" style={{ display: 'block' }} aria-hidden>
      <rect x="1" y="1" width="20" height="20" fill="#f5c400" stroke="#0b1620" strokeWidth="2" />
      <path
        d="M 14 6 L 8 6 L 8 16 L 14 16 L 14 11 L 11 11"
        stroke="#0b1620"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function SpinGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
      aria-hidden
    >
      <path
        d="M 7 1.5 a 5.5 5.5 0 1 1 -4 9.3 a 3.7 3.7 0 1 1 6 -2.7 a 2.1 2.1 0 1 1 -2.9 1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EyeGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * (10 / 14)}
      viewBox="0 0 14 10"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
      aria-hidden
    >
      <path d="M 1 5 Q 7 0.5 13 5 Q 7 9.5 1 5 Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="7" cy="5" rx="1.6" ry="2.6" fill="currentColor" />
    </svg>
  );
}

// ── Riveted plate ───────────────────────────────────────────────────────
export function Plate({
  children,
  tone,
  style,
}: {
  children: ReactNode;
  tone?: 'yellow' | 'red';
  style?: CSSProperties;
}) {
  return (
    <span className={'plate' + (tone ? ` plate--${tone}` : '')} style={style}>
      {children}
    </span>
  );
}

// ── Priority chip ────────────────────────────────────────────────────────
const PRIORITY_CLASS: Record<Priority, string> = {
  low: 'chip--low',
  medium: 'chip--medium',
  high: 'chip--high',
  urgent: 'chip--urgent',
  emergency: 'chip--emergency',
};

export function PriorityChip({ priority }: { priority: Priority }) {
  if (priority === 'emergency') {
    return (
      <span className="chip chip--emergency">
        <span>EMERGENCY</span>
      </span>
    );
  }
  return <span className={'chip ' + PRIORITY_CLASS[priority]}>{priority}</span>;
}

// ── Issue type chip ─────────────────────────────────────────────────────
export function TypeChip({ type }: { type: IssueType }) {
  return <span className={'type-chip type-' + type}>{type[0]!.toUpperCase()}</span>;
}

// ── Label chip ───────────────────────────────────────────────────────────
export function LabelChip({ label }: { label: LabelView }) {
  // Real labels store a hex color; render it directly with readable text.
  const dark = isDarkColor(label.color);
  return (
    <span
      className="chip"
      style={{
        background: label.color,
        color: dark ? 'var(--eg-paper)' : 'var(--eg-iron)',
        borderColor: 'var(--eg-iron)',
      }}
    >
      {label.name}
    </span>
  );
}

// ── Avatar (text initials, stable hue from id) ───────────────────────────
const HUES = ['ink', 'yellow', 'gold', 'green', 'red'] as const;

export function hueFor(seed: string): (typeof HUES)[number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length]!;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function Avatar({
  user,
  name,
  seed,
  lg,
  style,
}: {
  user?: UserView | null;
  name?: string;
  seed?: string;
  lg?: boolean;
  style?: CSSProperties;
}) {
  const display = user?.name ?? name ?? '';
  const hue = hueFor(seed ?? user?.id ?? display);
  return (
    <span className={'avatar avatar--' + hue + (lg ? ' avatar--lg' : '')} style={style} title={display}>
      {initialsOf(display)}
    </span>
  );
}

function isDarkColor(hex: string): boolean {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return false;
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}
