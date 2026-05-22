// SPDX-License-Identifier: GPL-3.0-or-later
import { type Status, prisma } from '@gira/db';
import { createProject } from '../../src/modules/projects/service.js';

/** Create a project (with default statuses) and return a name→Status lookup. */
export async function seedProject(opts: {
  reporterId: string;
  key?: string;
  clientId?: string | null;
}): Promise<{ projectKey: string; byName: Record<string, Status> }> {
  const key = opts.key ?? 'GIRA';
  const project = await createProject(
    { key, name: key, clientId: opts.clientId ?? null },
    opts.reporterId,
  );
  const statuses = await prisma.status.findMany({
    where: { projectId: project.id },
    orderBy: { order: 'asc' },
  });
  const byName = Object.fromEntries(statuses.map((s) => [s.name, s])) as Record<string, Status>;
  return { projectKey: key, byName };
}
