// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';
import type { InvoiceLineKind } from './views.js';

/**
 * Generate a draft invoice for a client. The (optional) period bounds which
 * billable worklogs get pulled in — by loggedAt. Omit both to bill everything
 * not yet invoiced. Dates arrive as ISO strings and become inclusive bounds.
 */
/** Record the external TicketBAI fiscal-invoice number on a billing annex. */
export const setExternalRefSchema = z.object({
  externalInvoiceRef: z.string().trim().max(120).nullable(),
});
export type SetExternalRef = z.infer<typeof setExternalRefSchema>;

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

/**
 * Derive an annex line's billing nature from its frozen fields (no extra column needed).
 * RETAINER/OVERAGE are sentinel issue keys; a null rate with a non-zero amount is a fixed
 * price; a null rate with a zero amount is retainer-covered maintenance; otherwise hourly.
 */
export function invoiceLineKind(line: {
  issueKey: string;
  hourlyCents: number | null;
  amountCents: number;
}): InvoiceLineKind {
  if (line.issueKey === 'RETAINER') return 'retainer';
  if (line.issueKey === 'OVERAGE') return 'overage';
  if (line.hourlyCents !== null) return 'billable';
  return line.amountCents > 0 ? 'fixed' : 'maintenance';
}
