// SPDX-License-Identifier: GPL-3.0-or-later
import { type Prisma, prisma } from '@gira/db';
import { rankBetween } from '@gira/domain';
import { recordAudit } from '@gira/sauron';
import type { CreateIssue } from '@gira/shared';
import { badRequest, notFound } from '../../lib/http-error.js';

export const issueInclude = {
  assignee: true,
  reporter: true,
  labels: true,
  status: true,
  project: { select: { key: true, clientId: true } },
} satisfies Prisma.IssueInclude;

export type IssueWithRelations = Prisma.IssueGetPayload<{ include: typeof issueInclude }>;

export async function loadIssueOr404(key: string): Promise<IssueWithRelations> {
  const issue = await prisma.issue.findUnique({ where: { key }, include: issueInclude });
  if (!issue) throw notFound('issue not found');
  return issue;
}

export async function createIssue(
  input: CreateIssue,
  reporterId: string,
): Promise<IssueWithRelations> {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { key: input.projectKey },
      include: { statuses: { orderBy: { order: 'asc' } } },
    });
    if (!project) throw notFound('project not found');

    let statusId = input.statusId;
    if (statusId) {
      if (!project.statuses.some((s) => s.id === statusId)) {
        throw badRequest('statusId does not belong to this project');
      }
    } else {
      const first = project.statuses[0];
      if (!first) throw badRequest('project has no statuses');
      statusId = first.id;
    }

    // Atomic key: bump the project's counter inside the transaction.
    const counted = await tx.project.update({
      where: { id: project.id },
      data: { issueCounter: { increment: 1 } },
      select: { key: true, issueCounter: true },
    });
    const key = `${counted.key}-${counted.issueCounter}`;

    // Place at the end of the target column.
    const last = await tx.issue.findFirst({
      where: { projectId: project.id, statusId },
      orderBy: { rank: 'desc' },
      select: { rank: true },
    });
    const rank = rankBetween(last?.rank ?? null, null);

    const issue = await tx.issue.create({
      data: {
        projectId: project.id,
        key,
        title: input.title,
        description: input.description,
        type: input.type,
        priority: input.priority,
        statusId,
        reporterId,
        assigneeId: input.assigneeId ?? null,
        sprintId: input.sprintId ?? null,
        parentId: input.parentId ?? null,
        storyPoints: input.storyPoints ?? null,
        estimateMinutes: input.estimateMinutes ?? null,
        dueAt: input.dueAt ?? null,
        rank,
        billingMode: input.billingMode,
        fixedPriceCents: input.fixedPriceCents ?? null,
        labels: input.labelIds?.length
          ? { connect: input.labelIds.map((id) => ({ id })) }
          : undefined,
      },
      include: issueInclude,
    });

    if (issue.priority === 'emergency') {
      await emitEmergency(tx, key, project.key, issue.title);
    }
    if (issue.assigneeId) {
      await tx.outbox.create({
        data: {
          type: 'issue.assigned',
          payload: { issueKey: key, projectKey: project.key, assigneeId: issue.assigneeId, title: issue.title },
        },
      });
    }
    await recordAudit(tx, {
      actorId: reporterId,
      action: 'issue.create',
      entityType: 'Issue',
      entityId: issue.id,
      after: { key, title: issue.title, priority: issue.priority },
    });
    return issue;
  });
}

/** The seam M3 emergency paging consumes: a domain event on the outbox. */
export async function emitEmergency(
  tx: Prisma.TransactionClient,
  issueKey: string,
  projectKey: string,
  title: string,
): Promise<void> {
  await tx.outbox.create({
    data: { type: 'issue.emergency', payload: { issueKey, projectKey, title } },
  });
}
