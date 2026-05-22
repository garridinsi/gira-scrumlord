// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { formatCents, formatMinutes } from '../lib/format';

describe('formatCents', () => {
  it('formats zero cents', () => {
    const result = formatCents(0, 'EUR');
    expect(result).toBe('€0.00');
  });

  it('formats integer cents to currency with 2 decimal places', () => {
    // 12345 cents = €123.45
    const result = formatCents(12345, 'EUR');
    expect(result).toBe('€123.45');
  });

  it('formats USD cents', () => {
    const result = formatCents(9999, 'USD');
    expect(result).toBe('$99.99');
  });

  it('formats large amount', () => {
    // 1_000_000 cents = €10,000.00
    const result = formatCents(1_000_000, 'EUR');
    expect(result).toBe('€10,000.00');
  });

  it('does not produce floating point artifacts for round amounts', () => {
    // 100 cents = exactly €1.00
    const result = formatCents(100, 'EUR');
    expect(result).toBe('€1.00');
  });

  it('formats 1 cent', () => {
    const result = formatCents(1, 'EUR');
    expect(result).toBe('€0.01');
  });
});

describe('formatMinutes', () => {
  it('returns "0m" for zero', () => {
    expect(formatMinutes(0)).toBe('0m');
  });

  it('returns "0m" for negative values', () => {
    expect(formatMinutes(-5)).toBe('0m');
  });

  it('formats minutes only (< 60)', () => {
    expect(formatMinutes(30)).toBe('30m');
    expect(formatMinutes(59)).toBe('59m');
  });

  it('formats exactly 60 minutes as 1h', () => {
    expect(formatMinutes(60)).toBe('1h');
  });

  it('formats hours and minutes', () => {
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(125)).toBe('2h 5m');
  });

  it('formats round hours without trailing minutes', () => {
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(480)).toBe('8h');
  });

  it('formats large values', () => {
    expect(formatMinutes(1440)).toBe('24h'); // exactly 1 day
    expect(formatMinutes(1445)).toBe('24h 5m');
  });
});
