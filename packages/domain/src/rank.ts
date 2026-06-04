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
 * Thrown when two ranks are immediate neighbours (e.g. "m" and "m0", or inserting
 * before "0") and admit no string strictly between them. The board move catches
 * this and rebalances the column rather than writing an out-of-order rank.
 */
export class NoRankSpaceError extends Error {
  constructor(lo: string, hi: string) {
    super(`no rank exists strictly between "${lo}" and "${hi}" — rebalance needed`);
    this.name = 'NoRankSpaceError';
  }
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
    // hi === '' means +infinity (pad with BASE). A FINITE hi that's exhausted pads
    // with 0 — its value is "this prefix followed by zeros", NOT unbounded. Padding
    // a finite-exhausted hi with BASE was the bug: it let results sort AFTER hi
    // (e.g. between("m","m0") wrongly returned "m0i").
    const n = hi === '' ? BASE : i < hi.length ? val(hi[i]!) : 0;
    if (p === n) {
      // Both exhausted and still equal → lo and hi denote the same point
      // (hi = lo + "0…0"); nothing exists strictly between them.
      const loDone = i >= lo.length;
      const hiDone = hi !== '' && i >= hi.length;
      if (loDone && hiDone) throw new NoRankSpaceError(lo, hi);
      result += DIGITS[p]!;
      i++;
      continue;
    }
    /* c8 ignore start -- defensive: unreachable via the public API. `between` is only
       called by rankBetween, which throws on prev >= next (line 41) before we get here,
       so p <= n always holds. Kept as a guard against a future internal caller. */
    if (p > n) {
      throw new NoRankSpaceError(lo, hi);
    }
    /* c8 ignore stop */
    const mid = Math.floor((p + n) / 2);
    if (mid !== p) {
      return result + DIGITS[mid]!;
    }
    // Digits are adjacent (n === p + 1): keep lo's digit — we're now below hi here,
    // so the upper bound falls away and we recurse with no upper bound.
    result += DIGITS[p]!;
    return result + between(lo.slice(i + 1), '');
  }
}

/** Convenience: rank for the first slot of an empty column. */
export function initialRank(): string {
  return rankBetween(null, null);
}
