// SPDX-License-Identifier: GPL-3.0-or-later
// B2: compute an issue's SLA status from its A1 transition ledger, measuring elapsed time
// in business hours (B1 engine). Response = created → first transition off the birth
// status; resolution = created → first entry into a 'done' status. While a milestone is
// unmet the clock runs to "now", so a stalled issue breaches its target in real time.
// Targets resolve per project+priority (SlaPolicy), falling back to the global env default.
import { type IssueEvent, type SlaPolicy, prisma } from '@gira/db';
import { type BusinessCalendar, businessMinutesBetween } from '@gira/domain';
import type { SlaAttainmentView, SlaClockView, SlaView } from '@gira/shared';
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

interface Targets {
  responseMinutes: number;
  resolutionMinutes: number;
}

// priority-specific policy → project default (priority null) → global env default.
function resolveTargets(policies: SlaPolicy[], priority: string): Targets {
  const specific = policies.find((p) => p.priority === priority);
  const dflt = policies.find((p) => p.priority === null);
  return {
    responseMinutes:
      specific?.responseMinutes ??
      dflt?.responseMinutes ??
      Math.round(config.SLA_RESPONSE_HOURS * 60),
    resolutionMinutes:
      specific?.resolutionMinutes ??
      dflt?.resolutionMinutes ??
      Math.round(config.SLA_RESOLUTION_HOURS * 60),
  };
}

// Pure clock from a single issue's createdAt + its ledger, given targets + calendar + now.
function clocks(
  createdAt: Date,
  events: IssueEvent[],
  targets: Targets,
  cal: BusinessCalendar,
  now: Date,
): { response: SlaClockView; resolution: SlaClockView } {
  const firstResponse =
    events.find((e) => e.kind === 'status_changed' || e.kind === 'reopened') ?? null;
  const resolved = events.find((e) => e.statusCategory === 'done') ?? null;
  const responseElapsed = businessMinutesBetween(createdAt, firstResponse?.createdAt ?? now, cal);
  const resolutionElapsed = businessMinutesBetween(createdAt, resolved?.createdAt ?? now, cal);
  return {
    response: {
      targetMinutes: targets.responseMinutes,
      elapsedMinutes: responseElapsed,
      met: firstResponse != null,
      breached: responseElapsed > targets.responseMinutes,
    },
    resolution: {
      targetMinutes: targets.resolutionMinutes,
      elapsedMinutes: resolutionElapsed,
      met: resolved != null,
      breached: resolutionElapsed > targets.resolutionMinutes,
    },
  };
}

export async function computeSla(issueKey: string, now: Date = new Date()): Promise<SlaView> {
  const issue = await prisma.issue.findUnique({
    where: { key: issueKey },
    select: { id: true, key: true, createdAt: true, priority: true, projectId: true },
  });
  if (!issue) throw notFound('issue not found');

  const [events, policies] = await Promise.all([
    prisma.issueEvent.findMany({ where: { issueId: issue.id }, orderBy: { createdAt: 'asc' } }),
    prisma.slaPolicy.findMany({ where: { projectId: issue.projectId } }),
  ]);
  const targets = resolveTargets(policies, issue.priority);
  const { response, resolution } = clocks(
    issue.createdAt,
    events,
    targets,
    businessCalendar(),
    now,
  );
  return { issueKey: issue.key, businessTimeZone: config.BILLING_TIMEZONE, response, resolution };
}

/** Project-wide attainment: of the issues where a milestone applies, the share met within target. */
export async function computeAttainment(
  projectId: string,
  projectKey: string,
  now: Date = new Date(),
): Promise<SlaAttainmentView> {
  const cal = businessCalendar();
  const [issues, policies] = await Promise.all([
    prisma.issue.findMany({
      where: { projectId },
      select: { id: true, createdAt: true, priority: true },
    }),
    prisma.slaPolicy.findMany({ where: { projectId } }),
  ]);
  const events = await prisma.issueEvent.findMany({
    where: { issueId: { in: issues.map((i) => i.id) } },
    orderBy: { createdAt: 'asc' },
  });
  const byIssue = new Map<string, IssueEvent[]>();
  for (const e of events) {
    const list = byIssue.get(e.issueId) ?? [];
    list.push(e);
    byIssue.set(e.issueId, list);
  }

  let respApplicable = 0;
  let respMet = 0;
  let resApplicable = 0;
  let resMet = 0;
  for (const issue of issues) {
    const targets = resolveTargets(policies, issue.priority);
    const { response, resolution } = clocks(
      issue.createdAt,
      byIssue.get(issue.id) ?? [],
      targets,
      cal,
      now,
    );
    // "Applicable" = the milestone has been reached; attainment measures whether it was
    // reached within target. (Still-open issues aren't counted as failures here — they're
    // surfaced live per-issue via the running breach clock instead.)
    if (response.met) {
      respApplicable++;
      if (!response.breached) respMet++;
    }
    if (resolution.met) {
      resApplicable++;
      if (!resolution.breached) resMet++;
    }
  }
  const pct = (met: number, applicable: number) =>
    applicable === 0 ? null : Math.round((met / applicable) * 1000) / 10;
  return {
    projectKey,
    response: { applicable: respApplicable, met: respMet, pct: pct(respMet, respApplicable) },
    resolution: { applicable: resApplicable, met: resMet, pct: pct(resMet, resApplicable) },
  };
}
