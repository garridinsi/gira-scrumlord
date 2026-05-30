// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';

export const createWorklogSchema = z.object({
  minutes: z.number().int().min(1).max(24 * 60),
  note: z.string().max(2000).default(''),
  billable: z.boolean().default(true),
  loggedAt: z.coerce.date().optional(),
});
export type CreateWorklog = z.infer<typeof createWorklogSchema>;

/** Edit an existing worklog. All fields optional; at least one must be present. */
export const updateWorklogSchema = z
  .object({
    minutes: z.number().int().min(1).max(24 * 60).optional(),
    note: z.string().max(2000).optional(),
    billable: z.boolean().optional(),
    loggedAt: z.coerce.date().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'nothing to update' });
export type UpdateWorklog = z.infer<typeof updateWorklogSchema>;

export const startTimerSchema = z.object({
  issueKey: z.string().min(1),
});
export type StartTimer = z.infer<typeof startTimerSchema>;
