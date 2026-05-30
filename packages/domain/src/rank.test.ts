// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { NoRankSpaceError, initialRank, rankBetween } from './rank.js';

describe('rankBetween', () => {
  it('produces a non-empty rank for an empty column', () => {
    expect(rankBetween(null, null).length).toBeGreaterThan(0);
  });

  it('orders strictly between two neighbours', () => {
    const a = rankBetween(null, null);
    const before = rankBetween(null, a);
    const after = rankBetween(a, null);
    expect(before < a).toBe(true);
    expect(a < after).toBe(true);
  });

  it('finds a value between adjacent-looking ranks', () => {
    const mid = rankBetween('a', 'b');
    expect('a' < mid).toBe(true);
    expect(mid < 'b').toBe(true);
  });

  it('appends above an all-max rank', () => {
    const r = rankBetween('zzzz', null);
    expect('zzzz' < r).toBe(true);
  });

  it('stays ordered and unique across 100 inserts between the same pair', () => {
    let lo = rankBetween(null, null);
    const hi = rankBetween(lo, null);
    const seen = new Set<string>([lo, hi]);
    for (let i = 0; i < 100; i++) {
      const mid = rankBetween(lo, hi);
      expect(lo < mid && mid < hi).toBe(true);
      expect(seen.has(mid)).toBe(false);
      seen.add(mid);
      lo = mid; // keep squeezing toward hi
    }
  });

  it('throws when prev >= next', () => {
    expect(() => rankBetween('b', 'a')).toThrow();
    expect(() => rankBetween('a', 'a')).toThrow();
  });

  it('initialRank is a valid rank', () => {
    expect(initialRank().length).toBeGreaterThan(0);
  });

  // Regression: the old algorithm padded a finite-exhausted upper bound with BASE,
  // so rankBetween("m","m0") returned "m0i" which sorts AFTER "m0" — silent board
  // mis-ordering. Immediate neighbours have NO value between them → must throw.
  it('throws NoRankSpaceError for immediate neighbours instead of mis-ordering', () => {
    for (const [lo, hi] of [
      ['m', 'm0'],
      ['z', 'z0'],
      ['1', '10'],
      ['a', 'a00'],
    ] as const) {
      expect(() => rankBetween(lo, hi), `${lo} / ${hi}`).toThrow(NoRankSpaceError);
    }
    // Nothing sorts before "0" either.
    expect(() => rankBetween(null, '0')).toThrow(NoRankSpaceError);
    expect(() => rankBetween(null, '00')).toThrow(NoRankSpaceError);
  });

  it('NEVER returns a rank outside (prev, next) — randomized invariant', () => {
    const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
    let seed = 1234567;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const randRank = () => {
      const len = 1 + Math.floor(rnd() * 4);
      let s = '';
      for (let i = 0; i < len; i++) s += DIGITS[Math.floor(rnd() * 36)]!;
      return s;
    };
    for (let t = 0; t < 5000; t++) {
      const a = randRank();
      const b = randRank();
      const [lo, hi] = a < b ? [a, b] : [b, a];
      if (lo === hi) continue;
      try {
        const mid = rankBetween(lo, hi);
        expect(lo < mid && mid < hi, `between ${lo}/${hi} got ${mid}`).toBe(true);
      } catch (e) {
        // The only legal failure is "no space" between immediate neighbours.
        expect(e).toBeInstanceOf(NoRankSpaceError);
      }
    }
  });

  it('open-ended bounds always produce ordered, in-range ranks', () => {
    const r = randomWalk();
    for (let i = 1; i < r.length; i++) expect(r[i - 1]! < r[i]!).toBe(true);
  });
});

// Build a column by repeatedly inserting before/after/between existing ranks.
function randomWalk(): string[] {
  let seed = 42;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const ranks: string[] = [rankBetween(null, null)];
  for (let i = 0; i < 200; i++) {
    const at = Math.floor(rnd() * (ranks.length + 1));
    const lo = at > 0 ? ranks[at - 1]! : null;
    const hi = at < ranks.length ? ranks[at]! : null;
    try {
      const r = rankBetween(lo, hi);
      ranks.splice(at, 0, r);
    } catch {
      // No space here — a real board would rebalance; skip for this ordering check.
    }
  }
  return ranks;
}
