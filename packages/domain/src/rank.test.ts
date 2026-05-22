// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { initialRank, rankBetween } from './rank.js';

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
});
