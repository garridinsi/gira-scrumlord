// SPDX-License-Identifier: GPL-3.0-or-later
// B1: business-hours math. Counts working minutes between two instants, excluding nights,
// non-working weekdays, and holidays — the basis for SLA breach clocks (B2). Pure: the
// calendar is passed in; no config, no I/O. All reasoning is done in the calendar's IANA
// timezone so DST shifts and the wall-clock working window line up.

export interface BusinessCalendar {
  /** IANA timezone the working window is expressed in (e.g. 'Europe/Madrid'). */
  timeZone: string;
  /** Working weekdays as JS day numbers (0=Sun … 6=Sat), e.g. [1,2,3,4,5] for Mon–Fri. */
  workdays: number[];
  /** Start of the working window, minutes from local midnight (inclusive). 9:00 = 540. */
  startMinute: number;
  /** End of the working window, minutes from local midnight (exclusive). 17:00 = 1020. */
  endMinute: number;
  /** Non-working calendar dates as 'YYYY-MM-DD' in `timeZone`. */
  holidays: string[];
}

// Milliseconds the timezone's wall clock is ahead of UTC at a given instant.
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value;
  const asUTC = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  return asUTC - instant.getTime();
}

// The 'YYYY-MM-DD' calendar date of an instant, evaluated in the timezone.
function zonedYmd(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(instant)
    .slice(0, 10);
}

// The UTC instant for `minuteOfDay` minutes past local midnight on the given calendar date.
function zonedTimeToUtc(ymd: string, minuteOfDay: number, timeZone: string): Date {
  const [y, mo, d] = ymd.split('-').map(Number);
  const guess = Date.UTC(y!, mo! - 1, d!) + minuteOfDay * 60_000;
  // One offset correction suffices: the working window (e.g. 9:00–17:00) never straddles
  // the DST switch (02:00/03:00), so the offset sampled at the guess is the right one.
  return new Date(guess - tzOffsetMs(new Date(guess), timeZone));
}

/**
 * Working minutes between `start` and `end` under `cal`. Zero if end ≤ start. Each
 * calendar day in range contributes the overlap of [start,end] with that day's working
 * window, but only if the day is a workday and not a holiday.
 */
export function businessMinutesBetween(start: Date, end: Date, cal: BusinessCalendar): number {
  if (end.getTime() <= start.getTime()) return 0;
  const endMs = end.getTime();
  let total = 0;
  // Walk day by day from start's calendar day. Snap to local midnight each step (adding
  // ~26h then re-snapping absorbs DST day-length changes without skipping/repeating a day).
  let dayYmd = zonedYmd(start, cal.timeZone);
  // 800-day cap: a backstop against a pathological range; real SLA spans are days/weeks.
  for (let i = 0; i < 800; i++) {
    const midnightUtc = zonedTimeToUtc(dayYmd, 0, cal.timeZone);
    if (midnightUtc.getTime() >= endMs) break;

    const [y, mo, d] = dayYmd.split('-').map(Number);
    const weekday = new Date(Date.UTC(y!, mo! - 1, d!)).getUTCDay();
    if (cal.workdays.includes(weekday) && !cal.holidays.includes(dayYmd)) {
      const winStart = zonedTimeToUtc(dayYmd, cal.startMinute, cal.timeZone).getTime();
      const winEnd = zonedTimeToUtc(dayYmd, cal.endMinute, cal.timeZone).getTime();
      const lo = Math.max(start.getTime(), winStart);
      const hi = Math.min(endMs, winEnd);
      if (hi > lo) total += Math.round((hi - lo) / 60_000);
    }
    // Advance to the next calendar day.
    dayYmd = zonedYmd(new Date(midnightUtc.getTime() + 26 * 60 * 60 * 1000), cal.timeZone);
  }
  return total;
}
