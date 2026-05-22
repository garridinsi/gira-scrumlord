// SPDX-License-Identifier: GPL-3.0-or-later
// Zod enums mirroring the Prisma enums. Single source of allowed values.

import { z } from 'zod';

export const issueType = z.enum(['task', 'bug', 'story', 'epic']);
export const priority = z.enum(['low', 'medium', 'high', 'urgent', 'emergency']);
export const statusCategory = z.enum(['todo', 'in_progress', 'done']);
export const userKind = z.enum(['staff', 'client']);
export const userRole = z.enum(['admin', 'member', 'viewer']);
export const billingMode = z.enum(['hourly', 'fixed']);
export const rateScope = z.enum(['default', 'client', 'project', 'issue']);
export const sprintState = z.enum(['future', 'active', 'closed']);

export type IssueType = z.infer<typeof issueType>;
export type Priority = z.infer<typeof priority>;
export type StatusCategory = z.infer<typeof statusCategory>;
export type UserKind = z.infer<typeof userKind>;
export type UserRole = z.infer<typeof userRole>;
export type BillingMode = z.infer<typeof billingMode>;
export type RateScope = z.infer<typeof rateScope>;
export type SprintState = z.infer<typeof sprintState>;

/** Urgency ranking, highest first. `emergency` is the paging tier. */
export const PRIORITY_ORDER: Record<Priority, number> = {
  emergency: 0,
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
};
