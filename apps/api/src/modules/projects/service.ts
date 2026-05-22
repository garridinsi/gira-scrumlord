// SPDX-License-Identifier: GPL-3.0-or-later
import { type Project, type StatusCategory, prisma } from '@gira/db';
import { recordAudit } from '@gira/sauron';
import type { CreateProject } from '@gira/shared';
import { notFound } from '../../lib/http-error.js';

/** The classic five columns every new project starts with. */
export const DEFAULT_STATUSES: Array<{ name: string; category: StatusCategory; order: number }> = [
  { name: 'Backlog', category: 'todo', order: 0 },
  { name: 'To Do', category: 'todo', order: 1 },
  { name: 'In Progress', category: 'in_progress', order: 2 },
  { name: 'In Review', category: 'in_progress', order: 3 },
  { name: 'Done', category: 'done', order: 4 },
];

export async function createProject(input: CreateProject, actorId: string): Promise<Project> {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description ?? '',
        clientId: input.clientId ?? null,
      },
    });
    await tx.status.createMany({
      data: DEFAULT_STATUSES.map((s) => ({ ...s, projectId: project.id })),
    });
    await recordAudit(tx, {
      actorId,
      action: 'project.create',
      entityType: 'Project',
      entityId: project.id,
      after: project,
    });
    return project;
  });
}

/** Load a project by key or throw 404. (Scope is checked separately by the caller.) */
export async function getProjectByKeyOr404(key: string): Promise<Project> {
  const project = await prisma.project.findUnique({ where: { key } });
  if (!project) throw notFound('project not found');
  return project;
}
