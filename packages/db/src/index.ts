// SPDX-License-Identifier: GPL-3.0-or-later
// gira-scrumlord — the single Prisma client + re-exported model types/enums.

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * One PrismaClient for the whole process. Reused across hot-reloads in dev so we
 * don't exhaust Postgres connections.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === 'query' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export everything: model types, enums (IssueType, Priority, ...), Prisma namespace.
export * from '@prisma/client';
export { Prisma } from '@prisma/client';
