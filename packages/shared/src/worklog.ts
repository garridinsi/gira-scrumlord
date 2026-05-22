// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';

export const createWorklogSchema = z.object({
  minutes: z.number().int().min(1).max(24 * 60),
  note: z.string().max(2000).default(''),
  billable: z.boolean().default(true),
  loggedAt: z.coerce.date().optional(),
});
export type CreateWorklog = z.infer<typeof createWorklogSchema>;

export const startTimerSchema = z.object({
  issueKey: z.string().min(1),
});
export type StartTimer = z.infer<typeof startTimerSchema>;
