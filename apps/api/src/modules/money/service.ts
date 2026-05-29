// SPDX-License-Identifier: GPL-3.0-or-later
// Money. Resolve the effective rate (issue→project→client→default) and derive
// accrued cost. Everything in integer cents.

import { type Rate, prisma } from '@gira/db';
import { type ResolvedRate, accruedCents, resolveRate } from '@gira/domain';
import type { CostView, ProjectMonthlyView, ProjectSummaryView } from '@gira/shared';
import { config } from '../../config.js';
import { notFound } from '../../lib/http-error.js';
import { computeVelocity } from '../sprints/service.js';

const toResolved = (r: Rate | null | undefined): ResolvedRate | null =>
  r ? { hourlyCents: r.hourlyCents, currency: r.currency } : null;

/** "YYYY-MM" for a timestamp, evaluated in the given IANA timezone. */
function monthKey(d: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD; slicing gives the timezone-correct calendar month.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(d)
    .slice(0, 7);
}

export async function computeIssueCost(issueKey: string): Promise<CostView> {
  const issue = await prisma.issue.findUnique({
    where: { key: issueKey },
    include: {
      project: { select: { id: true, clientId: true } },
      worklogs: { select: { minutes: true, billable: true } },
    },
  });
  if (!issue) throw notFound('issue not found');

  const [issueRate, projectRate, clientRate, defaultRate] = await Promise.all([
    prisma.rate.findUnique({ where: { issueId: issue.id } }),
    prisma.rate.findUnique({ where: { projectId: issue.project.id } }),
    issue.project.clientId
      ? prisma.rate.findUnique({ where: { clientId: issue.project.clientId } })
      : Promise.resolve(null),
    prisma.rate.findFirst({ where: { scope: 'default' } }),
  ]);

  const resolved = resolveRate({
    issue: toResolved(issueRate),
    project: toResolved(projectRate),
    client: toResolved(clientRate),
    fallback: toResolved(defaultRate),
  });

  const minutes = issue.worklogs.reduce((s, w) => s + w.minutes, 0);
  const billableMinutes = issue.worklogs
    .filter((w) => w.billable)
    .reduce((s, w) => s + w.minutes, 0);

  return {
    issueKey: issue.key,
    minutes,
    billableMinutes,
    billingMode: issue.billingMode,
    hourlyCents: resolved?.hourlyCents ?? null,
    currency: resolved?.currency ?? clientRate?.currency ?? defaultRate?.currency ?? 'EUR',
    accruedCents: accruedCents({
      billingMode: issue.billingMode,
      fixedPriceCents: issue.fixedPriceCents,
      billableMinutes,
      hourlyCents: resolved?.hourlyCents ?? null,
    }),
  };
}

export async function computeProjectSummary(projectKey: string): Promise<ProjectSummaryView> {
  const project = await prisma.project.findUnique({
    where: { key: projectKey },
    include: { client: { select: { currency: true } } },
  });
  if (!project) throw notFound('project not found');

  const [issues, projectRate, clientRate, defaultRate, activeSprint] = await Promise.all([
    prisma.issue.findMany({
      where: { projectId: project.id },
      include: {
        status: { select: { category: true } },
        worklogs: { select: { minutes: true, billable: true } },
      },
    }),
    prisma.rate.findUnique({ where: { projectId: project.id } }),
    project.clientId
      ? prisma.rate.findUnique({ where: { clientId: project.clientId } })
      : Promise.resolve(null),
    prisma.rate.findFirst({ where: { scope: 'default' } }),
    prisma.sprint.findFirst({ where: { projectId: project.id, state: 'active' } }),
  ]);

  const issueRates = await prisma.rate.findMany({
    where: { issueId: { in: issues.map((i) => i.id) } },
  });
  const issueRateById = new Map(issueRates.map((r) => [r.issueId, r]));

  let totalMinutes = 0;
  let billableMinutes = 0;
  let accrued = 0;
  let open = 0;
  let done = 0;

  for (const i of issues) {
    const m = i.worklogs.reduce((s, w) => s + w.minutes, 0);
    const bm = i.worklogs.filter((w) => w.billable).reduce((s, w) => s + w.minutes, 0);
    totalMinutes += m;
    billableMinutes += bm;
    if (i.status.category === 'done') done += 1;
    else open += 1;

    const resolved = resolveRate({
      issue: toResolved(issueRateById.get(i.id)),
      project: toResolved(projectRate),
      client: toResolved(clientRate),
      fallback: toResolved(defaultRate),
    });
    accrued += accruedCents({
      billingMode: i.billingMode,
      fixedPriceCents: i.fixedPriceCents,
      billableMinutes: bm,
      hourlyCents: resolved?.hourlyCents ?? null,
    });
  }

  return {
    projectKey,
    currency: clientRate?.currency ?? defaultRate?.currency ?? project.client?.currency ?? 'EUR',
    totalMinutes,
    billableMinutes,
    accruedCents: accrued,
    openIssues: open,
    doneIssues: done,
    activeSprint: activeSprint
      ? {
          id: activeSprint.id,
          name: activeSprint.name,
          velocity: await computeVelocity(activeSprint.id, activeSprint.committedPoints),
        }
      : null,
  };
}

/**
 * Time + accrued cost bucketed by calendar month — the maintenance/monthly lens.
 * Hourly issues accrue billable-minutes × resolved rate; fixed-price issues are
 * excluded from the per-month cost (their price isn't time-based). Most recent first.
 */
export async function computeProjectMonthly(
  projectKey: string,
  monthsBack = 12,
): Promise<ProjectMonthlyView> {
  const project = await prisma.project.findUnique({
    where: { key: projectKey },
    include: { client: { select: { currency: true } } },
  });
  if (!project) throw notFound('project not found');

  const [issues, projectRate, clientRate, defaultRate] = await Promise.all([
    prisma.issue.findMany({ where: { projectId: project.id }, select: { id: true, billingMode: true } }),
    prisma.rate.findUnique({ where: { projectId: project.id } }),
    project.clientId
      ? prisma.rate.findUnique({ where: { clientId: project.clientId } })
      : Promise.resolve(null),
    prisma.rate.findFirst({ where: { scope: 'default' } }),
  ]);
  const issueRates = await prisma.rate.findMany({ where: { issueId: { in: issues.map((i) => i.id) } } });
  const issueRateById = new Map(issueRates.map((r) => [r.issueId, r]));
  const billingModeById = new Map(issues.map((i) => [i.id, i.billingMode]));
  const rateFor = (issueId: string) =>
    resolveRate({
      issue: toResolved(issueRateById.get(issueId)),
      project: toResolved(projectRate),
      client: toResolved(clientRate),
      fallback: toResolved(defaultRate),
    });

  const worklogs = await prisma.worklog.findMany({
    where: { issue: { projectId: project.id } },
    select: { minutes: true, billable: true, loggedAt: true, issueId: true },
  });

  // Bucket per (month, issue) and round cost ONCE per issue-month — matching how
  // invoice generation rounds per issue — so the "invoice this month" total equals
  // what's shown here. Month is derived in the configured billing timezone so a
  // worklog logged at 23:30 local on the last of the month doesn't slip to the next.
  interface Bucket {
    totalMinutes: number;
    billableMinutes: number;
    hourlyMinutesByIssue: Map<string, number>;
  }
  const buckets = new Map<string, Bucket>();
  for (const w of worklogs) {
    const month = monthKey(w.loggedAt, config.BILLING_TIMEZONE);
    const b =
      buckets.get(month) ??
      ({ totalMinutes: 0, billableMinutes: 0, hourlyMinutesByIssue: new Map() } satisfies Bucket);
    b.totalMinutes += w.minutes;
    if (w.billable) {
      b.billableMinutes += w.minutes;
      if ((billingModeById.get(w.issueId) ?? 'hourly') === 'hourly') {
        b.hourlyMinutesByIssue.set(w.issueId, (b.hourlyMinutesByIssue.get(w.issueId) ?? 0) + w.minutes);
      }
    }
    buckets.set(month, b);
  }

  const months = [...buckets.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, monthsBack)
    .map(([month, b]) => {
      let accrued = 0;
      for (const [issueId, mins] of b.hourlyMinutesByIssue) {
        const r = rateFor(issueId);
        accrued += accruedCents({ billingMode: 'hourly', billableMinutes: mins, hourlyCents: r?.hourlyCents ?? null });
      }
      return {
        month,
        totalMinutes: b.totalMinutes,
        billableMinutes: b.billableMinutes,
        accruedCents: accrued,
      };
    });

  return {
    projectKey,
    currency: clientRate?.currency ?? defaultRate?.currency ?? project.client?.currency ?? 'EUR',
    budgetMinutes: project.monthlyBudgetMinutes,
    budgetCents: project.monthlyBudgetCents,
    months,
  };
}
