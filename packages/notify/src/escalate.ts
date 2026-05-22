// SPDX-License-Identifier: GPL-3.0-or-later
// Re-page open incidents that nobody has acknowledged yet, up to a max level.

import { prisma } from '@gira/db';
import { dispatchEvent } from './dispatch.js';

export async function escalateOpenIncidents(
  opts: { intervalMinutes?: number; maxLevel?: number; now?: Date } = {},
): Promise<number> {
  const intervalMinutes = opts.intervalMinutes ?? 5;
  const maxLevel = opts.maxLevel ?? 3;
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - intervalMinutes * 60_000);

  const incidents = await prisma.incident.findMany({
    where: {
      status: 'open',
      escalationLevel: { lt: maxLevel },
      OR: [{ lastNotifiedAt: null }, { lastNotifiedAt: { lt: cutoff } }],
    },
    include: { issue: { select: { key: true, title: true, project: { select: { key: true } } } } },
  });

  let escalated = 0;
  for (const inc of incidents) {
    await dispatchEvent({
      type: 'issue.emergency',
      payload: {
        issueKey: inc.issue.key,
        projectKey: inc.issue.project.key,
        title: inc.issue.title,
        escalationLevel: inc.escalationLevel + 1,
      },
    });
    await prisma.incident.update({
      where: { id: inc.id },
      data: { escalationLevel: { increment: 1 }, lastNotifiedAt: now },
    });
    escalated += 1;
  }
  return escalated;
}
