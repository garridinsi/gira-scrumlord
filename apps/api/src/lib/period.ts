// SPDX-License-Identifier: GPL-3.0-or-later
// Billing-period helpers shared by the monthly rollup, annex generation, and P1
// period locks — so all three agree on which calendar month a timestamp belongs to.
import { prisma } from '@gira/db';
import { config } from '../config.js';
import { conflict } from './http-error.js';

/** "YYYY-MM" for a timestamp, evaluated in the given IANA timezone. */
export function monthKey(d: Date, timeZone: string = config.BILLING_TIMEZONE): string {
  // en-CA formats as YYYY-MM-DD; slicing gives the timezone-correct calendar month.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(d)
    .slice(0, 7);
}

/**
 * P1 guard: refuse to create/edit a worklog dated in a locked billing month. Internal
 * (clientless) projects are never lockable, so they pass through. Pass every month the
 * write would touch (the current one, and the target one if loggedAt is moving).
 */
export async function assertPeriodNotLocked(
  clientId: string | null,
  ...instants: Date[]
): Promise<void> {
  if (!clientId) return;
  const months = [...new Set(instants.map((d) => monthKey(d)))];
  const lock = await prisma.periodLock.findFirst({
    where: { clientId, monthKey: { in: months } },
  });
  if (lock) {
    throw conflict(
      `billing period ${lock.monthKey} is locked for this client — unlock it before changing time logged in that month`,
    );
  }
}
