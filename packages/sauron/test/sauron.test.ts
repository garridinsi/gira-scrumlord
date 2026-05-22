// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { recordAudit } from '../src/record.js';
import { buildSauron } from '../src/server.js';

describe('sauron', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = buildSauron();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
  });

  it('records an entry and serves it read-only', async () => {
    await recordAudit(prisma, {
      action: 'issue.create',
      entityType: 'Issue',
      entityId: 'iss_1',
      after: { title: 'Summon the core' },
    });

    const res = await app.inject({ method: 'GET', url: '/audit?entityType=Issue&entityId=iss_1' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.count).toBe(1);
    expect(body.entries[0]).toMatchObject({ action: 'issue.create', entityType: 'Issue' });
    expect(body.entries[0].after).toEqual({ title: 'Summon the core' });
  });

  it('filters by action and respects the limit', async () => {
    for (let i = 0; i < 5; i++) {
      await recordAudit(prisma, { action: 'issue.move', entityType: 'Issue', entityId: `i${i}` });
    }
    await recordAudit(prisma, { action: 'issue.create', entityType: 'Issue', entityId: 'x' });

    const moves = (await app.inject({ url: '/audit?action=issue.move' })).json();
    expect(moves.count).toBe(5);
    const limited = (await app.inject({ url: '/audit?limit=2' })).json();
    expect(limited.count).toBe(2);
  });

  it('refuses to act — writes are 405 (the eye only watches)', async () => {
    const res = await app.inject({ method: 'POST', url: '/audit' });
    expect(res.statusCode).toBe(405);
    expect(res.json().error).toBe('the eye only watches');
  });

  it('health reports the eye is open', async () => {
    const res = await app.inject({ url: '/health' });
    expect(res.json()).toMatchObject({ status: 'ok', eye: 'open' });
  });
});
