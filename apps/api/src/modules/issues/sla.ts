// SPDX-License-Identifier: GPL-3.0-or-later
// B2: compute an issue's SLA status from its A1 transition ledger, measuring elapsed time
// in business hours (B1 engine). Response = created → first transition off the birth
// status; resolution = created → first entry into a 'done' status. While a milestone is
// unmet the clock runs to "now", so a stalled issue breaches its target in real time.
import { type BusinessCalendar, businessMinutesBetween } from '@gira/domain';
import { prisma } from '@gira/db';
import type { SlaView } from '@gira/shared';
import { config } from '../../config.js';
import { notFound } from '../../lib/http-error.js';

function businessCalendar(): BusinessCalendar {
  return {
    timeZone: config.BILLING_TIMEZONE,
    workdays: [1, 2, 3, 4, 5], // Mon–Fri
    startMinute: config.BUSINESS_DAY_START_HOUR * 60,
    endMinute: config.BUSINESS_DAY_END_HOUR * 60,
    holidays: config.BUSINESS_HOLIDAYS
      ? config.BUSINESS_HOLIDAYS.split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  };
}

export async function computeSla(issueKey: string, now: Date = new Date()): Promise<SlaView> {
  const issue = await prisma.issue.findUnique({
    where: { key: issueKey },
    select: { key: true, createdAt: true, id: true },
  });
  if (!issue) throw notFound('issue not found');

  const events = await prisma.issueEvent.findMany({
    where: { issueId: issue.id },
    orderBy: { createdAt: 'asc' },
  });
  const firstResponse =
    events.find((e) => e.kind === 'status_changed' || e.kind === 'reopened') ?? null;
  const resolved = events.find((e) => e.statusCategory === 'done') ?? null;

  const cal = businessCalendar();
  const responseTarget = Math.round(config.SLA_RESPONSE_HOURS * 60);
  const resolutionTarget = Math.round(config.SLA_RESOLUTION_HOURS * 60);
  const responseElapsed = businessMinutesBetween(
    issue.createdAt,
    firstResponse?.createdAt ?? now,
    cal,
  );
  const resolutionElapsed = businessMinutesBetween(
    issue.createdAt,
    resolved?.createdAt ?? now,
    cal,
  );

  return {
    issueKey: issue.key,
    businessTimeZone: cal.timeZone,
    response: {
      targetMinutes: responseTarget,
      elapsedMinutes: responseElapsed,
      met: firstResponse != null,
      breached: responseElapsed > responseTarget,
    },
    resolution: {
      targetMinutes: resolutionTarget,
      elapsedMinutes: resolutionElapsed,
      met: resolved != null,
      breached: resolutionElapsed > resolutionTarget,
    },
  };
}
