// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { accruedCents, resolveRate } from './rate.js';

const r = (hourlyCents: number) => ({ hourlyCents, currency: 'EUR' });

describe('resolveRate', () => {
  it('prefers issue over project over client over default', () => {
    expect(resolveRate({ issue: r(1), project: r(2), client: r(3), fallback: r(4) })?.hourlyCents).toBe(1);
    expect(resolveRate({ project: r(2), client: r(3), fallback: r(4) })?.hourlyCents).toBe(2);
    expect(resolveRate({ client: r(3), fallback: r(4) })?.hourlyCents).toBe(3);
    expect(resolveRate({ fallback: r(4) })?.hourlyCents).toBe(4);
  });

  it('returns null when nothing is configured', () => {
    expect(resolveRate({})).toBeNull();
    expect(resolveRate({ issue: null, project: null })).toBeNull();
  });
});

describe('accruedCents', () => {
  it('fixed mode ignores logged minutes', () => {
    expect(accruedCents({ billingMode: 'fixed', fixedPriceCents: 25000, billableMinutes: 9999, hourlyCents: 8000 })).toBe(25000);
  });

  it('fixed mode with no price is zero', () => {
    expect(accruedCents({ billingMode: 'fixed', billableMinutes: 60, hourlyCents: 8000 })).toBe(0);
  });

  it('hourly mode bills minutes/60 * rate, rounded to the cent', () => {
    expect(accruedCents({ billingMode: 'hourly', billableMinutes: 90, hourlyCents: 10000 })).toBe(15000);
    expect(accruedCents({ billingMode: 'hourly', billableMinutes: 30, hourlyCents: 8000 })).toBe(4000);
    expect(accruedCents({ billingMode: 'hourly', billableMinutes: 1, hourlyCents: 10000 })).toBe(167);
  });

  it('hourly mode with no resolvable rate is zero', () => {
    expect(accruedCents({ billingMode: 'hourly', billableMinutes: 120, hourlyCents: null })).toBe(0);
  });
});
