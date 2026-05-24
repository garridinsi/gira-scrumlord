// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';

/**
 * Generate a draft invoice for a client. The (optional) period bounds which
 * billable worklogs get pulled in — by loggedAt. Omit both to bill everything
 * not yet invoiced. Dates arrive as ISO strings and become inclusive bounds.
 */
export const generateInvoiceSchema = z
  .object({
    periodStart: z.coerce.date().optional(),
    periodEnd: z.coerce.date().optional(),
    notes: z.string().max(2_000).optional(),
  })
  .refine((v) => !v.periodStart || !v.periodEnd || v.periodStart <= v.periodEnd, {
    message: 'periodStart must be on or before periodEnd',
    path: ['periodStart'],
  });
export type GenerateInvoice = z.infer<typeof generateInvoiceSchema>;
