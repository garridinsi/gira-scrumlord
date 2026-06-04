// SPDX-License-Identifier: GPL-3.0-or-later
// Per-user Telegram channel link endpoints (/auth/me/telegram). Self-scoped, auth-required,
// and inert when the channel is unconfigured. The test env sets TELEGRAM_BOT_TOKEN so the
// channel is ON; gating-off is asserted by the unit/config tests in @gira/notify.
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { resetDb } from './helpers/db.js';

describe('Telegram link (/auth/me/telegram)', () => {
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

  it('requires authentication', async () => {
    expect((await app.inject({ method: 'GET', url: '/auth/me/telegram' })).statusCode).toBe(401);
    expect(
      (await app.inject({ method: 'PUT', url: '/auth/me/telegram', payload: { chatId: '1' } }))
        .statusCode,
    ).toBe(401);
  });

  it('reports enabled + unlinked, links, upserts, and unlinks — all self-scoped', async () => {
    const { cookie } = await actingAs({ role: 'member' });

    // Initially enabled (token set) but not linked.
    let status = (
      await app.inject({ method: 'GET', url: '/auth/me/telegram', headers: { cookie } })
    ).json();
    expect(status).toEqual({ enabled: true, linked: false, chatId: null });

    // Link a chat id.
    const put = await app.inject({
      method: 'PUT',
      url: '/auth/me/telegram',
      headers: { cookie },
      payload: { chatId: '99887766' },
    });
    expect(put.statusCode).toBe(204);
    status = (
      await app.inject({ method: 'GET', url: '/auth/me/telegram', headers: { cookie } })
    ).json();
    expect(status).toEqual({ enabled: true, linked: true, chatId: '99887766' });

    // Upsert: changing it replaces, never duplicates (userId is unique).
    await app.inject({
      method: 'PUT',
      url: '/auth/me/telegram',
      headers: { cookie },
      payload: { chatId: '-100200300' }, // group chats are negative
    });
    status = (
      await app.inject({ method: 'GET', url: '/auth/me/telegram', headers: { cookie } })
    ).json();
    expect(status.chatId).toBe('-100200300');

    // Unlink.
    expect(
      (await app.inject({ method: 'DELETE', url: '/auth/me/telegram', headers: { cookie } }))
        .statusCode,
    ).toBe(204);
    status = (
      await app.inject({ method: 'GET', url: '/auth/me/telegram', headers: { cookie } })
    ).json();
    expect(status).toEqual({ enabled: true, linked: false, chatId: null });
  });

  it('rejects a non-numeric chat id (Zod 400)', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const res = await app.inject({
      method: 'PUT',
      url: '/auth/me/telegram',
      headers: { cookie },
      payload: { chatId: 'not-a-number' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('never exposes another user’s link', async () => {
    const a = await actingAs({ role: 'member' });
    const b = await actingAs({ role: 'member' });
    await app.inject({
      method: 'PUT',
      url: '/auth/me/telegram',
      headers: { cookie: a.cookie },
      payload: { chatId: '12345' },
    });
    const bStatus = (
      await app.inject({ method: 'GET', url: '/auth/me/telegram', headers: { cookie: b.cookie } })
    ).json();
    expect(bStatus).toEqual({ enabled: true, linked: false, chatId: null });
  });
});
