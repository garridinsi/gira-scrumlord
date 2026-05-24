// SPDX-License-Identifier: GPL-3.0-or-later
// Client portal: aggregate a client's own projects into open/in-progress/done
// counts plus time + money rollups. Reuses the money summary for the £/€ math.

import { prisma } from '@gira/db';
import type { PortalOverviewView, PortalProjectRollup } from '@gira/shared';
import { computeProjectSummary } from '../money/service.js';

export async function computePortalOverview(clientId: string): Promise<PortalOverviewView> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true, currency: true },
  });
  const projects = await prisma.project.findMany({
    where: { clientId },
    orderBy: { key: 'asc' },
    select: { id: true, key: true, name: true },
  });

  const rollups: PortalProjectRollup[] = [];
  const totals = {
    open: 0,
    inProgress: 0,
    done: 0,
    totalMinutes: 0,
    billableMinutes: 0,
    accruedCents: 0,
    currency: client?.currency ?? 'EUR',
  };

  for (const p of projects) {
    const [summary, issues] = await Promise.all([
      computeProjectSummary(p.key),
      prisma.issue.findMany({
        where: { projectId: p.id },
        select: { status: { select: { category: true } } },
      }),
    ]);

    let open = 0;
    let inProgress = 0;
    let done = 0;
    for (const i of issues) {
      if (i.status.category === 'done') done += 1;
      else if (i.status.category === 'in_progress') inProgress += 1;
      else open += 1;
    }

    rollups.push({
      key: p.key,
      name: p.name,
      open,
      inProgress,
      done,
      totalMinutes: summary.totalMinutes,
      billableMinutes: summary.billableMinutes,
      accruedCents: summary.accruedCents,
    });

    totals.open += open;
    totals.inProgress += inProgress;
    totals.done += done;
    totals.totalMinutes += summary.totalMinutes;
    totals.billableMinutes += summary.billableMinutes;
    totals.accruedCents += summary.accruedCents;
  }

  return {
    client: client ? { name: client.name, currency: client.currency } : null,
    projects: rollups,
    totals,
  };
}
