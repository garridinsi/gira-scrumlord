// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { prisma } from './helpers/db.js';

describe('health', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('GET /health → ok with db connected', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', db: true, name: 'gira-scrumlord' });
  });

  it('GET /health → 503 degraded when the database is unreachable', async () => {
    // A masked DB failure that still 200s would defeat uptime probes; assert it 503s.
    const spy = vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('db down'));
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ status: 'degraded', db: false });
    spy.mockRestore();
  });

  it('POST /client-errors accepts a crash report (204) and swallows junk', async () => {
    const ok = await app.inject({
      method: 'POST',
      url: '/client-errors',
      payload: { message: 'boom', componentStack: 'at <App>' },
    });
    expect(ok.statusCode).toBe(204);
    // A malformed body is swallowed, never a 400 the reporter would ignore.
    const junk = await app.inject({
      method: 'POST',
      url: '/client-errors',
      payload: { not: 'valid' },
    });
    expect(junk.statusCode).toBe(204);
  });

  it('unknown route → 404 json', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('not_found');
  });
});
