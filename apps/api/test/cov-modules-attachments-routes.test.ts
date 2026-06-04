// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage closure for src/modules/attachments/routes.ts lines 41-44: the size guards
// on upload. The empty-file guard (line 41) needs a base64 string that PASSES the Zod
// `.min(1)` check yet decodes to 0 bytes (a single `=`), so the request reaches the
// route body instead of being rejected at schema-parse. The too-large guard (lines
// 42-44) needs a buffer one byte over MAX_ATTACHMENT_BYTES; its base64 (~1.4 MiB) stays
// under the 2 MiB Fastify body limit.
import { MAX_ATTACHMENT_BYTES } from '@gira/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('cov src/modules/attachments/routes.ts', () => {
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
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { cookie },
      payload: { projectKey, title: 'Has files' },
    });
    return { cookie };
  }
  const upload = (cookie: string, filename: string, dataBase64: string) =>
    app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/attachments',
      headers: { cookie },
      payload: { filename, dataBase64 },
    });

  it('rejects a non-empty base64 string that decodes to 0 bytes (line 41)', async () => {
    const { cookie } = await setup();
    // `'='` satisfies the schema's `dataBase64.min(1)` but Buffer.from(_, 'base64')
    // yields an empty buffer — exercising the in-route empty-file guard, not Zod.
    const res = await upload(cookie, 'empty.png', '=');
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('empty file');
  });

  it('rejects a file larger than the cap (lines 42-44)', async () => {
    const { cookie } = await setup();
    // One byte over the 1 MiB cap; the size guard runs before sniffing, so any bytes work.
    const big = Buffer.alloc(MAX_ATTACHMENT_BYTES + 1, 0x89).toString('base64');
    const res = await upload(cookie, 'big.bin', big);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/file too large/i);
  });
});
