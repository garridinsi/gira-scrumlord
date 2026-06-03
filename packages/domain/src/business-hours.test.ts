// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { type BusinessCalendar, businessMinutesBetween } from './business-hours.js';

// Mon–Fri, 09:00–17:00 Europe/Madrid (CEST = UTC+2 in June, so the test instants use +02:00).
const cal: BusinessCalendar = {
  timeZone: 'Europe/Madrid',
  workdays: [1, 2, 3, 4, 5],
  startMinute: 9 * 60,
  endMinute: 17 * 60,
  holidays: [],
};
// 2026-06-01 is a Monday; 06-05 Fri, 06-06 Sat, 06-07 Sun, 06-08 Mon.
const d = (iso: string) => new Date(`${iso}+02:00`);

describe('businessMinutesBetween', () => {
  it('counts minutes within a single working day', () => {
    expect(businessMinutesBetween(d('2026-06-01T09:00'), d('2026-06-01T12:00'), cal)).toBe(180);
  });

  it('counts a full working day as the window length', () => {
    expect(businessMinutesBetween(d('2026-06-01T09:00'), d('2026-06-01T17:00'), cal)).toBe(480);
  });

  it('clamps the start up to the window open', () => {
    expect(businessMinutesBetween(d('2026-06-01T06:00'), d('2026-06-01T10:00'), cal)).toBe(60);
  });

  it('clamps the end down to the window close', () => {
    expect(businessMinutesBetween(d('2026-06-01T16:00'), d('2026-06-01T20:00'), cal)).toBe(60);
  });

  it('excludes the overnight gap between two working days', () => {
    // Mon 16:00→17:00 (60) + Tue 09:00→10:00 (60).
    expect(businessMinutesBetween(d('2026-06-01T16:00'), d('2026-06-02T10:00'), cal)).toBe(120);
  });

  it('skips the weekend', () => {
    // Fri 16:00→17:00 (60) + Mon 09:00→10:00 (60); Sat/Sun contribute nothing.
    expect(businessMinutesBetween(d('2026-06-05T16:00'), d('2026-06-08T10:00'), cal)).toBe(120);
  });

  it('skips a holiday', () => {
    const withHoliday = { ...cal, holidays: ['2026-06-02'] };
    // Mon 16:00→17:00 (60); Tue is a holiday → 0.
    expect(businessMinutesBetween(d('2026-06-01T16:00'), d('2026-06-02T10:00'), withHoliday)).toBe(
      60,
    );
  });

  it('sums several full days', () => {
    // Mon, Tue, Wed full windows = 3 × 480.
    expect(businessMinutesBetween(d('2026-06-01T09:00'), d('2026-06-03T17:00'), cal)).toBe(1440);
  });

  it('returns 0 for a span entirely outside working hours (a weekend)', () => {
    expect(businessMinutesBetween(d('2026-06-06T10:00'), d('2026-06-06T14:00'), cal)).toBe(0);
  });

  it('returns 0 when end is not after start', () => {
    expect(businessMinutesBetween(d('2026-06-01T12:00'), d('2026-06-01T12:00'), cal)).toBe(0);
    expect(businessMinutesBetween(d('2026-06-01T12:00'), d('2026-06-01T09:00'), cal)).toBe(0);
  });
});
