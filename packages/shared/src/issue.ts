// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';
import { billingMode, issueType, priority } from './enums.js';
import { projectKey } from './project.js';

const cuid = z.string().cuid();

export const createIssueSchema = z
  .object({
    projectKey,
    title: z.string().trim().min(1).max(200),
    description: z.string().max(50_000).default(''),
    type: issueType.default('task'),
    priority: priority.default('medium'),
    statusId: cuid.optional(), // defaults to the project's first column
    assigneeId: cuid.nullish(),
    sprintId: cuid.nullish(),
    parentId: cuid.nullish(),
    storyPoints: z.number().int().min(0).max(100).nullish(),
    estimateMinutes: z.number().int().min(0).nullish(),
    dueAt: z.coerce.date().nullish(),
    labelIds: z.array(cuid).max(20).optional(),
    billingMode: billingMode.default('hourly'),
    fixedPriceCents: z.number().int().min(0).nullish(),
  })
  .refine((v) => v.billingMode !== 'fixed' || v.fixedPriceCents != null, {
    message: 'fixedPriceCents is required when billingMode is fixed',
    path: ['fixedPriceCents'],
  });
export type CreateIssue = z.infer<typeof createIssueSchema>;

export const updateIssueSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(50_000).optional(),
  type: issueType.optional(),
  priority: priority.optional(),
  statusId: cuid.optional(),
  assigneeId: cuid.nullish(),
  sprintId: cuid.nullish(),
  parentId: cuid.nullish(),
  storyPoints: z.number().int().min(0).max(100).nullish(),
  estimateMinutes: z.number().int().min(0).nullish(),
  dueAt: z.coerce.date().nullish(),
  labelIds: z.array(cuid).max(20).optional(),
  billingMode: billingMode.optional(),
  fixedPriceCents: z.number().int().min(0).nullish(),
  resolution: z.string().trim().max(2000).nullish(), // D2: how the issue was resolved
  blockedReason: z.string().trim().max(2000).nullish(), // D1: non-null marks the issue Blocked
});
export type UpdateIssue = z.infer<typeof updateIssueSchema>;

/**
 * Board move. `beforeId`/`afterId` are the neighbour issue keys at the drop point;
 * the server computes the fractional rank between them. Omit both to append to the
 * end of the target column.
 */
export const moveIssueSchema = z.object({
  statusId: cuid.optional(),
  sprintId: cuid.nullish(),
  beforeId: z.string().optional(), // issue key, e.g. GIRA-3
  afterId: z.string().optional(),
});
export type MoveIssue = z.infer<typeof moveIssueSchema>;

export const issueFilterSchema = z.object({
  projectKey: projectKey.optional(),
  statusId: cuid.optional(),
  assigneeId: cuid.optional(),
  type: issueType.optional(),
  priority: priority.optional(),
  labelId: cuid.optional(),
  sprintId: cuid.optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
export type IssueFilter = z.infer<typeof issueFilterSchema>;

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(20_000),
});
export type CreateComment = z.infer<typeof createCommentSchema>;
