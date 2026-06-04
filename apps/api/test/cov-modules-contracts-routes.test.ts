// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage closure for src/modules/contracts/routes.ts:
//   - lines 20-21: toContractView's start/endDate `.toISOString()` arms (the non-null
//     branch) — reached by creating a contract WITH startDate/endDate, then reading it
//     back so the view serialises the real Dates.
//   - lines 91-94: the PATCH spread guards for includedHours/startDate/endDate/notes —
//     reached by sending all four keys in the update body so each `'x' in data` is truthy.
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { resetDb } from './helpers/db.js';

describe('cov src/modules/contracts/routes.ts', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
  });

  async function makeClient(cookie: string, slug: string): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: { cookie },
      payload: { name: slug, slug, currency: 'EUR' },
    });
    return res.json().id as string;
  }

  it('serialises non-null start/endDate to ISO strings in the view (lines 20-21)', async () => {
    const admin = await actingAs({ role: 'admin' });
    const clientId = await makeClient(admin.cookie, 'dated');

    const created = await app.inject({
      method: 'POST',
      url: '/contracts',
      headers: { cookie: admin.cookie },
      payload: {
        clientId,
        name: 'Dated SOW',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T00:00:00.000Z',
        status: 'active',
      },
    });
    expect(created.statusCode).toBe(201);
    const contract = created.json();
    expect(contract.startDate).toBe('2026-01-01T00:00:00.000Z');
    expect(contract.endDate).toBe('2026-12-31T00:00:00.000Z');

    // Read it back so toContractView runs again over the persisted (non-null) Dates.
    const one = await app.inject({
      method: 'GET',
      url: `/contracts/${contract.id}`,
      headers: { cookie: admin.cookie },
    });
    expect(one.statusCode).toBe(200);
    expect(one.json().startDate).toBe('2026-01-01T00:00:00.000Z');
    expect(one.json().endDate).toBe('2026-12-31T00:00:00.000Z');
  });

  it('applies the includedHours/startDate/endDate/notes patch spreads (lines 91-94)', async () => {
    const admin = await actingAs({ role: 'admin' });
    const clientId = await makeClient(admin.cookie, 'patchy');

    const created = await app.inject({
      method: 'POST',
      url: '/contracts',
      headers: { cookie: admin.cookie },
      payload: { clientId, name: 'Patchable SOW' },
    });
    expect(created.statusCode).toBe(201);
    const contract = created.json();

    const patched = await app.inject({
      method: 'PATCH',
      url: `/contracts/${contract.id}`,
      headers: { cookie: admin.cookie },
      payload: {
        includedHours: 80,
        startDate: '2026-02-01T00:00:00.000Z',
        endDate: '2026-08-01T00:00:00.000Z',
        notes: 'covers Q1-Q3',
      },
    });
    expect(patched.statusCode).toBe(200);
    const view = patched.json();
    expect(view.includedHours).toBe(80);
    expect(view.startDate).toBe('2026-02-01T00:00:00.000Z');
    expect(view.endDate).toBe('2026-08-01T00:00:00.000Z');
    expect(view.notes).toBe('covers Q1-Q3');
  });
});
