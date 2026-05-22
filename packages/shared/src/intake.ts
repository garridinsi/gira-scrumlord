// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';
import { intakeKind, issueType, priority } from './enums.js';

export const createIntakeSourceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: intakeKind,
  projectId: z.string().cuid(),
  defaultType: issueType.default('bug'),
  defaultPriority: priority.default('high'),
});
export type CreateIntakeSource = z.infer<typeof createIntakeSourceSchema>;

export const updateIntakeSourceSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  defaultType: issueType.optional(),
  defaultPriority: priority.optional(),
  active: z.boolean().optional(),
});
export type UpdateIntakeSource = z.infer<typeof updateIntakeSourceSchema>;

export const createAssignmentRuleSchema = z.object({
  assigneeId: z.string().cuid(),
  order: z.number().int().min(0).default(0),
  matchType: issueType.optional(),
  matchPriority: priority.optional(),
  matchLabelId: z.string().cuid().optional(),
});
export type CreateAssignmentRule = z.infer<typeof createAssignmentRuleSchema>;
