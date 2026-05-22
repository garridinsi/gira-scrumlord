// SPDX-License-Identifier: GPL-3.0-or-later
// The eye writes down everything. Append-only — sauron only watches.
//
// Call this inside the same Prisma transaction as the mutation it describes, so
// the audit row and the change commit (or roll back) together.

import { type Prisma, type PrismaClient } from '@gira/db';

/** Accepts the base client or a transaction client. */
type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditEntry {
  actorId?: string | null;
  action: string; // e.g. "issue.move"
  entityType: string; // e.g. "Issue"
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export async function recordAudit(db: Db, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before === undefined ? undefined : (entry.before as Prisma.InputJsonValue),
      after: entry.after === undefined ? undefined : (entry.after as Prisma.InputJsonValue),
    },
  });
}
