// SPDX-License-Identifier: GPL-3.0-or-later
// P1: a frozen billing month for a client.
import { z } from 'zod';

/** YYYY-MM (months 01-12). */
export const monthKeyPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export const createPeriodLockSchema = z.object({
  monthKey: z.string().regex(monthKeyPattern, 'monthKey must be YYYY-MM'),
  note: z.string().trim().max(2000).nullish(),
});
export type CreatePeriodLock = z.infer<typeof createPeriodLockSchema>;

export interface PeriodLockView {
  id: string;
  clientId: string;
  monthKey: string;
  lockedById: string | null;
  note: string | null;
  createdAt: string;
}
