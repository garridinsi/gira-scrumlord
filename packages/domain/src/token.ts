// SPDX-License-Identifier: GPL-3.0-or-later
// Secret generation + hashing for magic-link tokens and session secrets.
// We store only the SHA-256 hash; the raw secret lives only in the email link
// or the user's cookie. Comparison is constant-time.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** A URL-safe random secret plus its storable hash. */
export function generateToken(bytes = 32): { raw: string; hash: string } {
  const raw = randomBytes(bytes).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Constant-time comparison of two hex hashes of equal length. */
export function safeEqualHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
