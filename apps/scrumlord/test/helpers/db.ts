// SPDX-License-Identifier: GPL-3.0-or-later
// Test DB helpers: resetDb() truncates every public table except Prisma internals
// and pgboss-managed tables. Safe to call in beforeEach — the test DB is disposable.

import { prisma } from '@gira/db';

export { prisma };

/**
 * TRUNCATE all public tables except _prisma% and pgboss schema tables.
 * Restarts identity sequences so id counters are deterministic.
 */
export async function resetDb(): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '\_prisma%'`;

  if (rows.length === 0) return;

  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
