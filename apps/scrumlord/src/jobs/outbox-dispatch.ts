// SPDX-License-Identifier: GPL-3.0-or-later
// outbox-dispatch: drain the Outbox table through the real notification
// dispatcher (M3). Each event resolves matching channels, delivers (email /
// webhook), opens an Incident for emergencies, and is marked processed.

import { dispatchOutboxBatch } from '@gira/notify';

const BATCH_SIZE = 100;

/** Returns the number of Outbox rows processed. */
export async function runOutboxDispatch(_now = new Date()): Promise<number> {
  return dispatchOutboxBatch(BATCH_SIZE);
}
