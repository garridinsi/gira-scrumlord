// SPDX-License-Identifier: GPL-3.0-or-later
// outbox-dispatch: drain the Outbox table, logging each event.
// "emergency" priority events are logged loudly — this is the seam M3
// emergency paging will consume (see extension point below).

import { prisma } from '@gira/db';

const BATCH_SIZE = 100;

/**
 * Fetch up to BATCH_SIZE Outbox rows with processedAt=null, oldest first.
 * For each row:
 *   - Log it (loud for type containing "emergency" — M3 paging seam).
 *   - Set processedAt = now.
 *
 * Returns the number of rows processed.
 */
export async function runOutboxDispatch(now = new Date()): Promise<number> {
  const rows = await prisma.outbox.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  if (rows.length === 0) {
    return 0;
  }

  for (const row of rows) {
    const isEmergency = row.type.toLowerCase().includes('emergency');

    if (isEmergency) {
      // ── M3 EXTENSION POINT ───────────────────────────────────────────────
      // In Milestone 3, replace this block with a call to the paging adapter:
      //   await pagingAdapter.send({ type: row.type, payload: row.payload });
      // The adapter (in packages/chaos) will route to PagerDuty / OpsGenie /
      // SMS via the resolved escalation policy. For now, we just log loudly so
      // on-call engineers see it in stdout/journal even without M3 deployed.
      // ────────────────────────────────────────────────────────────────────
      console.error(
        `[outbox-dispatch] !!!EMERGENCY!!! id=${row.id} type=${row.type} payload=${JSON.stringify(row.payload)}`,
      );
    } else {
      console.log(
        `[outbox-dispatch] event id=${row.id} type=${row.type} payload=${JSON.stringify(row.payload)}`,
      );
    }
  }

  const ids = rows.map((r) => r.id);
  await prisma.outbox.updateMany({
    where: { id: { in: ids } },
    data: { processedAt: now },
  });

  console.log(`[outbox-dispatch] processed ${rows.length} event(s)`);
  return rows.length;
}
