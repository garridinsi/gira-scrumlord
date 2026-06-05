// SPDX-License-Identifier: GPL-3.0-or-later
// Telegram bot webhook (POST /telegram/webhook). Verified by the secret-token header (derived
// from the bot token); on /start it replies with the chat id. @gira/notify is mocked so no real
// Telegram request is made and sendTelegram is observable.
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const sendTelegram = vi.hoisted(() => vi.fn());
vi.mock('@gira/notify', () => ({
  notifyConfig: {
    telegramEnabled: true,
    telegramBotToken: 'test-bot-token',
    webPushEnabled: false,
  },
  sendTelegram,
  assertSafeWebhookUrl: () => {},
  deliver: vi.fn(),
}));

import { buildApp } from '../src/app.js';
import { telegramWebhookSecret } from '../src/modules/auth/routes.js';

const SECRET = () => ({ 'x-telegram-bot-api-secret-token': telegramWebhookSecret() });

describe('Telegram webhook (/telegram/webhook)', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => sendTelegram.mockReset().mockResolvedValue({ ok: true }));

  it('replies to /start with the chat id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/telegram/webhook',
      headers: SECRET(),
      payload: { message: { chat: { id: 509216472 }, text: '/start' } },
    });
    expect(res.statusCode).toBe(200);
    expect(sendTelegram).toHaveBeenCalledWith('509216472', expect.stringContaining('509216472'));
  });

  it('ignores non-/start messages (200, no reply)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/telegram/webhook',
      headers: SECRET(),
      payload: { message: { chat: { id: 1 }, text: 'hello there' } },
    });
    expect(res.statusCode).toBe(200);
    expect(sendTelegram).not.toHaveBeenCalled();
  });

  it('rejects a missing or wrong secret token (401) — forgery guard', async () => {
    expect(
      (await app.inject({ method: 'POST', url: '/telegram/webhook', payload: {} })).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/telegram/webhook',
          headers: { 'x-telegram-bot-api-secret-token': 'wrong' },
          payload: { message: { chat: { id: 1 }, text: '/start' } },
        })
      ).statusCode,
    ).toBe(401);
    expect(sendTelegram).not.toHaveBeenCalled();
  });
});
