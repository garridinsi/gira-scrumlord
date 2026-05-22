// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';

export const createSprintSchema = z.object({
  name: z.string().trim().min(1).max(120),
  goal: z.string().max(2000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type CreateSprint = z.infer<typeof createSprintSchema>;

export const updateSprintSchema = createSprintSchema.partial();
export type UpdateSprint = z.infer<typeof updateSprintSchema>;
