// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('cov src/modules/money/routes.ts', () => {
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

  const setRate = (cookie: string, body: object) =>
    app.inject({ method: 'POST', url: '/rates', headers: { cookie }, payload: body });

  // A valid-looking but nonexistent CUID — passes the schema's `.cuid()` check so the
  // route reaches clientCurrencyForRate(), then misses on the DB lookup.
  const GHOST_CUID = 'clxxxxxxxxxxxxxxxxxxxxxxx';

  // Line 25: client-scoped rate whose clientId is a well-formed CUID that doesn't exist
  // → clientCurrencyForRate throws notFound('client not found').
  it('404s on a client-scoped rate for a missing client', async () => {
    const { cookie } = await actingAs({ role: 'admin' });
    const res = await setRate(cookie, {
      scope: 'client',
      clientId: GHOST_CUID,
      hourlyCents: 8000,
      currency: 'EUR',
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('client not found');
  });

  // Line 33: project-scoped rate whose projectId is a well-formed CUID that doesn't exist
  // → clientCurrencyForRate throws notFound('project not found').
  it('404s on a project-scoped rate for a missing project', async () => {
    const { cookie } = await actingAs({ role: 'admin' });
    const res = await setRate(cookie, {
      scope: 'project',
      projectId: GHOST_CUID,
      hourlyCents: 7000,
      currency: 'EUR',
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('project not found');
  });

  // Line 34: project exists but has NO client → clientCurrencyForRate returns null, so the
  // currency-match guard is skipped and the rate is created (201).
  it('accepts a project-scoped rate when the project has no client', async () => {
    const { user, cookie } = await actingAs({ role: 'admin' });
    await seedProject({ reporterId: user.id, key: 'NOCL', clientId: null });
    const project = await prisma.project.findUniqueOrThrow({ where: { key: 'NOCL' } });

    const res = await setRate(cookie, {
      scope: 'project',
      projectId: project.id,
      hourlyCents: 7000,
      currency: 'USD', // any currency is fine: there's no client currency to clash with
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ scope: 'project', hourlyCents: 7000, currency: 'USD' });
  });

  // Line 41: issue-scoped rate whose issueId is a well-formed CUID that doesn't exist
  // → clientCurrencyForRate throws notFound('issue not found').
  it('404s on an issue-scoped rate for a missing issue', async () => {
    const { cookie } = await actingAs({ role: 'admin' });
    const res = await setRate(cookie, {
      scope: 'issue',
      issueId: GHOST_CUID,
      hourlyCents: 12000,
      currency: 'EUR',
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('issue not found');
  });

  // Line 42: issue exists but its project has NO client → clientCurrencyForRate returns
  // null, the currency-match guard is skipped, and the rate is created (201).
  it('accepts an issue-scoped rate when the issue project has no client', async () => {
    const { user, cookie } = await actingAs({ role: 'admin' });
    const { projectKey } = await seedProject({ reporterId: user.id, clientId: null });
    const created = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { cookie },
      payload: { projectKey, title: 'Billable' },
    });
    const issueId = created.json().id as string;

    const res = await setRate(cookie, {
      scope: 'issue',
      issueId,
      hourlyCents: 12000,
      currency: 'GBP', // no client → no currency to match against
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ scope: 'issue', hourlyCents: 12000, currency: 'GBP' });
  });

  // The default-scope create's P2002 race-recovery arm (source lines 79-83) is c8-ignored:
  // it only fires under a concurrent writer and can't be hit without spying prisma.rate,
  // which corrupts the single-fork suite. The happy default-rate create is covered below.
  it('creates the singleton default rate', async () => {
    const { cookie } = await actingAs({ role: 'admin' });
    const res = await setRate(cookie, { scope: 'default', hourlyCents: 5000, currency: 'EUR' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ scope: 'default', hourlyCents: 5000, currency: 'EUR' });
  });
});
