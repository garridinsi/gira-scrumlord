// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage closure for src/modules/portal/service.ts.
// Targets the two unreached null-client branches (driven via the exported
// computePortalOverview unit, called with a clientId that matches no row):
//   line 28 — totals.currency falls back to 'EUR' when client is null (client?.currency ?? 'EUR')
//   line 69 — the view's `client` field is null when no client is found (... : null)
import { describe, expect, it, beforeEach } from 'vitest';
import { computePortalOverview } from '../src/modules/portal/service.js';
import { resetDb } from './helpers/db.js';

describe('cov src/modules/portal/service.ts', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('returns a null client and the EUR currency fallback when the clientId resolves to no client (lines 28, 69)', async () => {
    // After resetDb no clients exist, so findUnique returns null for any id:
    // the `?? 'EUR'` fallback (line 28) and the `: null` client arm (line 69) both fire.
    const ov = await computePortalOverview('no-such-client-id');

    expect(ov.client).toBeNull();
    expect(ov.projects).toEqual([]);
    expect(ov.totals).toMatchObject({
      open: 0,
      inProgress: 0,
      done: 0,
      totalMinutes: 0,
      billableMinutes: 0,
      accruedCents: 0,
      currency: 'EUR',
    });
  });
});
