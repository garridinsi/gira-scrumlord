// SPDX-License-Identifier: GPL-3.0-or-later
// housekeeping: keep the unbounded auth/queue tables from growing forever.
// Deletes expired/revoked sessions, spent magic-link tokens, and long-since
// processed outbox rows (which would otherwise slow the `processedAt IS NULL`
// drain query and bloat storage). Audit rows are deliberately NOT touched —
// sauron is append-only and retained on purpose.

import { prisma } from '@gira/db';

const PROCESSED_OUTBOX_TTL_MS = 7 * 24 * 60 * 60 * 1000; // keep a week for debugging

export async function runHousekeeping(now = new Date()): Promise<number> {
  const outboxCutoff = new Date(now.getTime() - PROCESSED_OUTBOX_TTL_MS);

  const [sessions, tokens, outbox] = await prisma.$transaction([
    prisma.session.deleteMany({
      where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }] },
    }),
    prisma.magicLinkToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { not: null } }] },
    }),
    prisma.outbox.deleteMany({
      where: { processedAt: { lt: outboxCutoff } },
    }),
  ]);

  return sessions.count + tokens.count + outbox.count;
}
