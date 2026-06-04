// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage: src/modules/inbox/routes.ts line 15 — the `?? {}` fallback in toView()
// when a Notification row's `payload` Json column holds a JSON null. Prisma reads a
// JSON null back as JS `null`, so toView takes the `{}` arm. Reachable via GET /inbox.
import { Prisma, prisma } from '@gira/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { resetDb } from './helpers/db.js';

describe('cov src/modules/inbox/routes.ts', () => {
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

  it('coerces a JSON-null payload to {} in the inbox view (line 15)', async () => {
    const me = await actingAs({ role: 'member' });
    // A personal notification whose payload column is a JSON null, not an object.
    await prisma.notification.create({
      data: {
        type: 'issue.assigned',
        userId: me.user.id,
        payload: Prisma.JsonNull,
        status: 'sent',
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/inbox',
      headers: { cookie: me.cookie },
    });
    expect(res.statusCode).toBe(200);
    const items = res.json() as Array<{ payload: Record<string, unknown> }>;
    expect(items).toHaveLength(1);
    // The `?? {}` fallback turned the JSON null into an empty object.
    expect(items[0]!.payload).toEqual({});
  });
});
