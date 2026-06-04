// SPDX-License-Identifier: GPL-3.0-or-later
// Parse @mention tokens out of a comment/issue body. The web composer inserts an explicit,
// unambiguous token — @[Display Name](userId) — whenever a participant is picked, so we
// mention by stable id, never by a guessed handle (the User model has no username).
//
// Pure: text in, ids out. The caller MUST still authorize every id — a body can name
// anyone, including users who cannot see the issue. This only extracts the claims.

// @[label](id): label is 1–80 chars with no ']' or newline; id is a cuid-shaped token
// (lowercase alphanumerics, the shape Prisma's @default(cuid()) emits). The id is matched
// loosely on purpose — server-side authorization, not this regex, is the security boundary.
const MENTION = /@\[[^\]\n]{1,80}\]\(([a-z0-9]{10,40})\)/g;

/** Unique mentioned user ids, in first-seen order. */
export function parseMentions(body: string): string[] {
  if (!body) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const match of body.matchAll(MENTION)) {
    const id = match[1]!;
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}
