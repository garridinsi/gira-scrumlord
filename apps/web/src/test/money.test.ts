// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { formatMoney, formatRatePerHour } from '../lib/money';

describe('formatMoney', () => {
  it('formats integer cents code-prefixed in ES decimal style', () => {
    // 167100 cents = EUR 1671,00. Spanish convention does not group 4-digit
    // integers, so the decimal comma is the only separator here.
    expect(formatMoney(167100, 'EUR')).toBe('EUR 1671,00');
  });

  it('formats zero with two decimals', () => {
    expect(formatMoney(0, 'EUR')).toBe('EUR 0,00');
  });

  it('keeps sub-unit precision (99 cents)', () => {
    expect(formatMoney(99, 'EUR')).toBe('EUR 0,99');
  });

  it('groups thousands and respects the currency code argument', () => {
    expect(formatMoney(1_234_567, 'USD')).toBe('USD 12.345,67');
  });

  it('handles a single cent', () => {
    expect(formatMoney(1, 'EUR')).toBe('EUR 0,01');
  });
});

describe('formatRatePerHour', () => {
  it('formats a whole-euro hourly rate with the /h suffix (no decimals)', () => {
    // 17500 cents = EUR 175/h
    expect(formatRatePerHour(17500, 'EUR')).toBe('EUR 175/h');
  });

  it('rounds to the nearest whole unit', () => {
    expect(formatRatePerHour(17550, 'EUR')).toBe('EUR 176/h'); // 175.5 -> 176
    expect(formatRatePerHour(17549, 'EUR')).toBe('EUR 175/h'); // 175.49 -> 175
  });

  it('formats a zero rate', () => {
    expect(formatRatePerHour(0, 'USD')).toBe('USD 0/h');
  });

  it('respects the currency code argument', () => {
    expect(formatRatePerHour(9000, 'GBP')).toBe('GBP 90/h');
  });
});
