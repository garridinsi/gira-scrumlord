// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { config } from '../src/config.js';
import { computeAttainment, computeSla } from '../src/modules/issues/sla.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

// Targeted coverage for src/modules/issues/sla.ts: the holiday-list parse branch,
// the not-found guard in computeSla, and the empty-events / zero-applicable arms in
// computeAttainment.
describe('cov src/modules/issues/sla.ts', () => {
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

  async function setup() {
    const admin = await actingAs({ role: 'admin' });
    const { projectKey } = await seedProject({ reporterId: admin.user.id });
    return { admin, projectKey };
  }
  const create = (cookie: string, payload: object) =>
    app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload });

  // sla.ts:19–22 — BUSINESS_HOLIDAYS truthy → split/trim/filter(Boolean). Read live at
  // call time inside businessCalendar(), so we can flip config and restore it.
  it('parses a non-empty BUSINESS_HOLIDAYS list when computing SLA (sla.ts:19–22)', async () => {
    const { admin, projectKey } = await setup();
    await create(admin.cookie, { projectKey, title: 'Holiday-aware' }); // GIRA-1

    const original = config.BUSINESS_HOLIDAYS;
    config.BUSINESS_HOLIDAYS = '2026-01-01,  , 2026-12-25 ,'; // whitespace + empty segment
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/issues/GIRA-1/sla',
        headers: { cookie: admin.cookie },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.issueKey).toBe('GIRA-1');
      expect(body.response.targetMinutes).toBeGreaterThan(0);
    } finally {
      config.BUSINESS_HOLIDAYS = original;
    }
  });

  // sla.ts:82 — the not-found guard. The HTTP route runs loadIssueOr404 first, so this
  // arm is only reachable by calling computeSla directly with a missing key.
  it('computeSla throws notFound for an unknown issue key (sla.ts:82)', async () => {
    await expect(computeSla('NOPE-999')).rejects.toThrow('issue not found');
  });

  // sla.ts:132 + 150 — an issue with no ledger events: byIssue.get(id) ?? [] supplies the
  // empty list, no milestone is met, so applicable stays 0 and pct() returns null.
  it('computeAttainment handles an issue with no events: empty list + null pct (sla.ts:132,150)', async () => {
    const { admin, projectKey } = await setup();
    await create(admin.cookie, { projectKey, title: 'No ledger' }); // GIRA-1
    // Strip the auto-created 'created' event so this issue has zero events.
    const issue = await prisma.issue.findUniqueOrThrow({ where: { key: 'GIRA-1' } });
    await prisma.issueEvent.deleteMany({ where: { issueId: issue.id } });

    const att = await computeAttainment(issue.projectId, projectKey);
    expect(att.projectKey).toBe(projectKey);
    expect(att.response).toMatchObject({ applicable: 0, met: 0, pct: null });
    expect(att.resolution).toMatchObject({ applicable: 0, met: 0, pct: null });
  });
});
