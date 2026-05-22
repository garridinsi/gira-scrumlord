// SPDX-License-Identifier: GPL-3.0-or-later
import { type Sprint, prisma } from '@gira/db';
import { velocity } from '@gira/domain';
import type { VelocityView } from '@gira/shared';
import { notFound } from '../../lib/http-error.js';

export type SprintWithProject = Sprint & { project: { key: string; clientId: string | null } };

export async function loadSprintOr404(id: string): Promise<SprintWithProject> {
  const sprint = await prisma.sprint.findUnique({
    where: { id },
    include: { project: { select: { key: true, clientId: true } } },
  });
  if (!sprint) throw notFound('sprint not found');
  return sprint;
}

/** Velocity over a sprint's current issues (completed = done-category status). */
export async function computeVelocity(
  sprintId: string,
  committedOverride?: number | null,
): Promise<VelocityView> {
  const issues = await prisma.issue.findMany({
    where: { sprintId },
    include: { status: { select: { category: true } } },
  });
  return velocity(
    issues.map((i) => ({ storyPoints: i.storyPoints, statusCategory: i.status.category })),
    committedOverride,
  );
}
