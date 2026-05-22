// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';

const currency = z
  .string()
  .regex(/^[A-Z]{3}$/, 'currency must be a 3-letter ISO 4217 code')
  .default('EUR');

export const createClientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'slug must be lowercase kebab-case'),
  currency,
  notes: z.string().max(2000).optional(),
});
export type CreateClient = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial();
export type UpdateClient = z.infer<typeof updateClientSchema>;
