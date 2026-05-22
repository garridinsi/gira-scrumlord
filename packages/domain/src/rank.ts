// SPDX-License-Identifier: GPL-3.0-or-later
// Fractional (LexoRank-style) ordering for the board.
//
// Ranks are base-36 strings compared lexicographically. To place a card between
// two neighbours we find a string strictly between their ranks — so a drag-drop
// reorder is a single-row update, never a re-numbering of the whole column.

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
const BASE = DIGITS.length; // 36

function val(ch: string): number {
  const v = DIGITS.indexOf(ch);
  if (v < 0) throw new Error(`invalid rank digit: ${ch}`);
  return v;
}

/**
 * Returns a rank string strictly between `prev` and `next` (lexicographically).
 * Pass `null`/`undefined` for `prev` to mean "before the first" and for `next`
 * to mean "after the last". Throws if `prev >= next`.
 */
export function rankBetween(
  prev: string | null | undefined,
  next: string | null | undefined,
): string {
  const lo = prev ?? '';
  const hi = next ?? '';
  if (hi !== '' && lo >= hi) {
    throw new Error(`rankBetween: prev (${lo}) must be < next (${hi})`);
  }
  return between(lo, hi);
}

function between(lo: string, hi: string): string {
  let result = '';
  let i = 0;
  for (;;) {
    const p = i < lo.length ? val(lo[i]!) : 0;
    const n = hi !== '' && i < hi.length ? val(hi[i]!) : BASE;
    if (p === n) {
      result += DIGITS[p]!;
      i++;
      continue;
    }
    const mid = Math.floor((p + n) / 2);
    if (mid !== p) {
      return result + DIGITS[mid]!;
    }
    // lo and hi are adjacent at this digit: keep lo's digit, then the upper bound
    // falls away (the prefix is already < hi), so recurse with no upper bound.
    result += DIGITS[p]!;
    return result + between(lo.slice(i + 1), '');
  }
}

/** Convenience: rank for the first slot of an empty column. */
export function initialRank(): string {
  return rankBetween(null, null);
}
