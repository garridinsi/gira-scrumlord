// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';
import { projectKey } from './project.js';

/**
 * A client-submitted request becomes an issue in one of their own projects.
 * Constrained on purpose: clients can only file task/bug, never set priority
 * (no self-triggered emergencies) or assignee.
 */
export const createRequestSchema = z.object({
  projectKey,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20_000).default(''),
  type: z.enum(['task', 'bug']).default('bug'),
});
export type CreateRequest = z.infer<typeof createRequestSchema>;
