// SPDX-License-Identifier: GPL-3.0-or-later
// Money. Resolve the effective rate (issue→project→client→default) and derive
// accrued cost. Everything in integer cents.

import { type Rate, prisma } from '@gira/db';
import { type ResolvedRate, accruedCents, resolveRate } from '@gira/domain';
import type { CostView, ProjectSummaryView } from '@gira/shared';
import { notFound } from '../../lib/http-error.js';
import { computeVelocity } from '../sprints/service.js';

const toResolved = (r: Rate | null | undefined): ResolvedRate | null =>
  r ? { hourlyCents: r.hourlyCents, currency: r.currency } : null;

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
