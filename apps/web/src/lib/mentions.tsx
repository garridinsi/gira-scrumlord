// SPDX-License-Identifier: GPL-3.0-or-later
// Web-side mirror of the domain parser (packages/domain parseMentions): render a comment
// body's @[label](id) tokens as styled chips, and build a token for the composer picker.
import type { ReactNode } from 'react';

// label: 1–80 chars, no ']' or newline; id: cuid-shaped. Kept in sync with the server regex.
const MENTION = /@\[([^\]\n]{1,80})\]\(([a-z0-9]{10,40})\)/g;

/** The exact token the composer inserts when a participant is picked. */
export function mentionToken(user: { id: string; name: string }): string {
  return `@[${user.name}](${user.id})`;
}

/** Append a mention to a draft body, inserting a separating space when needed. */
export function appendMention(body: string, user: { id: string; name: string }): string {
  const sep = body.length === 0 || body.endsWith(' ') || body.endsWith('\n') ? '' : ' ';
  return `${body}${sep}${mentionToken(user)} `;
}

/** Render a body with @[label](id) tokens shown as mention chips; plain text otherwise. */
export function renderMentions(body: string): ReactNode {
  const matches = [...body.matchAll(MENTION)];
  if (matches.length === 0) return body;
  const out: ReactNode[] = [];
  let last = 0;
  matches.forEach((m, i) => {
    const idx = m.index ?? 0;
    if (idx > last) out.push(body.slice(last, idx));
    out.push(
      <span
        key={`m${i}`}
        className="mention-chip"
        style={{
          fontWeight: 700,
          color: 'var(--eg-iron)',
          background: 'var(--eg-yellow)',
          padding: '0 4px',
          whiteSpace: 'nowrap',
        }}
      >
        @{m[1]}
      </span>,
    );
    last = idx + m[0].length;
  });
  if (last < body.length) out.push(body.slice(last));
  return out;
}
