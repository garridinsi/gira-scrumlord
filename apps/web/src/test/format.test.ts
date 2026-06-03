// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatCents, formatMinutes, formatDate, formatRelativeTime } from '../lib/format';

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

describe('formatDate', () => {
  it('renders an ISO date as a readable short US date', () => {
    // Noon UTC keeps the calendar day stable across the runner's timezone.
    expect(formatDate('2026-07-01T12:00:00Z')).toBe('Jul 1, 2026');
    expect(formatDate('2026-01-15T12:00:00Z')).toBe('Jan 15, 2026');
  });
});

describe('formatRelativeTime', () => {
  // Anchor "now" so the deltas are deterministic regardless of timezone.
  const NOW = new Date('2026-06-15T12:00:00Z');

  afterEach(() => {
    vi.useRealTimers();
  });

  function withNow(fn: () => void) {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      fn();
    } finally {
      vi.useRealTimers();
    }
  }

  const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it('returns "just now" under a minute', () => {
    withNow(() => {
      expect(formatRelativeTime(ago(30 * 1000))).toBe('just now');
      expect(formatRelativeTime(ago(0))).toBe('just now');
    });
  });

  it('returns minutes for < 1 hour', () => {
    withNow(() => {
      expect(formatRelativeTime(ago(5 * MIN))).toBe('5m ago');
      expect(formatRelativeTime(ago(59 * MIN))).toBe('59m ago');
    });
  });

  it('returns hours for < 1 day', () => {
    withNow(() => {
      expect(formatRelativeTime(ago(2 * HOUR))).toBe('2h ago');
      expect(formatRelativeTime(ago(23 * HOUR))).toBe('23h ago');
    });
  });

  it('returns days for < 30 days', () => {
    withNow(() => {
      expect(formatRelativeTime(ago(3 * DAY))).toBe('3d ago');
      expect(formatRelativeTime(ago(29 * DAY))).toBe('29d ago');
    });
  });

  it('falls back to an absolute short date for >= 30 days', () => {
    withNow(() => {
      // 60 days before 2026-06-15 -> mid-April 2026; assert format shape, not the
      // exact day (timezone-safe).
      expect(formatRelativeTime(ago(60 * DAY))).toMatch(/^[A-Z][a-z]{2} \d{1,2}, 2026$/);
    });
  });
});
