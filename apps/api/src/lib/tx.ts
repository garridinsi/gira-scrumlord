// SPDX-License-Identifier: GPL-3.0-or-later
// Run a transaction at Serializable isolation, retrying on a write-conflict /
// serialization failure (Prisma P2034 / Postgres 40001). Used where concurrent
// callers read-then-write a shared invariant — board rank placement and the
// per-year annex sequence number — so the loser re-runs on a fresh snapshot
// instead of corrupting data or surfacing a raw 500.

import { Prisma, prisma } from '@gira/db';

export async function runSerializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries = 4,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'P2034' && attempt < maxRetries) continue; // serialization failure — retry
      throw e;
    }
    /* c8 ignore next 2 -- unreachable: the for(;;) only exits via return/throw above, so these closing braces never run */
  }
}
