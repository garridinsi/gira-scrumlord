// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for src/modules/money/service.ts. The route layer guards
// these three functions with loadIssueOr404 / getProjectByKeyOr404 *before* calling
// them, so the in-service not-found throws and the "no rate configured" fallback
// arms are unreachable through HTTP. We therefore call the service functions
// directly, seeding the exact DB shape each uncovered branch needs:
//   - the not-found guards (lines 24, 68, 150)
//   - the client-scoped rate lookup branch + null-rate fallbacks (29, 30, 52, 53, 58)
//   - the summary null-rate + currency fallbacks and the active-sprint arm (115, 121, 127-132)
//   - the monthly null-rate + currency fallbacks and the fixed-mode billable worklog
//     (so `=== 'hourly'` takes its false arm) (199, 219, 232)

import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { HttpError } from '../src/lib/http-error.js';
import {
  computeIssueCost,
  computeProjectMonthly,
  computeProjectSummary,
} from '../src/modules/money/service.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('cov src/modules/money/service.ts', () => {
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

  const createIssue = (cookie: string, payload: object) =>
    app.inject({ method: 'POST', url: '/issues', headers: { cookie }, payload });

  // ── not-found guards (lines 24, 68, 150) ─────────────────────────────────────
  it('computeIssueCost throws 404 when the issue is missing (line 24)', async () => {
    const err = await computeIssueCost('NOPE-1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).statusCode).toBe(404);
    expect((err as HttpError).message).toBe('issue not found');
  });

  it('computeProjectSummary throws 404 when the project is missing (line 68)', async () => {
    const err = await computeProjectSummary('NOPE').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).statusCode).toBe(404);
    expect((err as HttpError).message).toBe('project not found');
  });

  it('computeProjectMonthly throws 404 when the project is missing (line 150)', async () => {
    const err = await computeProjectMonthly('NOPE').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).statusCode).toBe(404);
    expect((err as HttpError).message).toBe('project not found');
  });

  // ── issue cost: client-scoped rate lookup + null-rate fallbacks ──────────────
  // Project HAS a client (so issue.project.clientId is truthy → line 29-30 client
  // rate lookup runs) but NO rates are configured anywhere, so resolveRate returns
  // null → hourlyCents falls back to null (52, 58) and currency falls to 'EUR' (53).
  it('issue cost resolves a client-scoped rate lookup yet falls back to null/EUR with no rates (29, 30, 52, 53, 58)', async () => {
    const client = await prisma.client.create({
      data: { name: 'Acme', slug: 'acme', currency: 'USD' },
    });
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({
      reporterId: user.id,
      key: 'ACME',
      clientId: client.id,
    });
    const issueId = (await createIssue(cookie, { projectKey, title: 'Billable' })).json()
      .id as string;
    await prisma.worklog.create({
      data: {
        issueId,
        userId: user.id,
        minutes: 90,
        billable: true,
        loggedAt: new Date('2026-04-01T09:00:00Z'),
      },
    });

    const cost = await computeIssueCost('ACME-1');
    expect(cost.hourlyCents).toBeNull(); // line 52 / 58 (?? null)
    expect(cost.currency).toBe('EUR'); // line 53: no resolved/client/default rate → 'EUR'
    expect(cost.billableMinutes).toBe(90);
    expect(cost.accruedCents).toBe(0); // hourly with no rate → 0
  });

  // ── project summary: null-rate fallback + currency fallback + active sprint ──
  // No rates configured (resolved null → line 115), no client (currency falls to
  // 'EUR' → line 121), and an active sprint with an attached issue exercises the
  // activeSprint branch + computeVelocity (lines 127-132).
  it('project summary falls back to null rate/EUR and reports the active sprint (115, 121, 127-132)', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const project = await prisma.project.findUniqueOrThrow({ where: { key: projectKey } });

    const issueId = (await createIssue(cookie, { projectKey, title: 'In sprint' })).json()
      .id as string;
    await prisma.worklog.create({
      data: {
        issueId,
        userId: user.id,
        minutes: 60,
        billable: true,
        loggedAt: new Date('2026-04-01T09:00:00Z'),
      },
    });

    const sprint = await prisma.sprint.create({
      data: {
        projectId: project.id,
        name: 'Sprint 1',
        state: 'active',
        committedPoints: 8,
      },
    });
    await prisma.issue.update({
      where: { id: issueId },
      data: { sprintId: sprint.id, storyPoints: 5 },
    });

    const summary = await computeProjectSummary(projectKey);
    expect(summary.currency).toBe('EUR'); // line 121: no rates, no client currency → 'EUR'
    expect(summary.accruedCents).toBe(0); // line 115: hourly issue, no rate → 0
    expect(summary.billableMinutes).toBe(60);
    expect(summary.openIssues).toBe(1);
    expect(summary.activeSprint).toMatchObject({ id: sprint.id, name: 'Sprint 1' }); // 127-131
    expect(summary.activeSprint?.velocity).toMatchObject({ committedPoints: 8 }); // computeVelocity ran
  });

  // ── monthly: null-rate fallback + currency fallback + fixed-mode false arm ───
  // No rates (resolved null → line 219), no client (currency → 'EUR' line 232), and
  // a fixed-billing issue with a billable worklog so the `=== 'hourly'` guard takes
  // its FALSE arm (line 199) while the hourly issue takes the true arm.
  it('monthly rollup falls back to null rate/EUR and skips fixed-mode billable time (199, 219, 232)', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });

    const hourlyId = (await createIssue(cookie, { projectKey, title: 'Hourly' })).json()
      .id as string;
    const fixedId = (
      await createIssue(cookie, {
        projectKey,
        title: 'Fixed',
        billingMode: 'fixed',
        fixedPriceCents: 25000,
      })
    ).json().id as string;

    const loggedAt = new Date('2026-04-10T09:00:00Z');
    await prisma.worklog.create({
      data: { issueId: hourlyId, userId: user.id, minutes: 120, billable: true, loggedAt },
    });
    // Billable worklog on a FIXED issue → bucket counts the minutes but the
    // `=== 'hourly'` guard (line 199) is false, so it is NOT added to the hourly map.
    await prisma.worklog.create({
      data: { issueId: fixedId, userId: user.id, minutes: 30, billable: true, loggedAt },
    });

    const monthly = await computeProjectMonthly(projectKey);
    expect(monthly.currency).toBe('EUR'); // line 232: no rates, no client currency → 'EUR'
    const april = monthly.months.find((m) => m.month === '2026-04');
    expect(april).toBeDefined();
    expect(april!.billableMinutes).toBe(150); // hourly 120 + fixed 30, both billable
    // Hourly issue has no resolvable rate → line 219 (?? null) → accrued 0. The fixed
    // issue's billable minutes never entered the hourly map, so they add nothing either.
    expect(april!.accruedCents).toBe(0);
  });
});
