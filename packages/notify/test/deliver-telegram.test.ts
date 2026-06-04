// SPDX-License-Identifier: GPL-3.0-or-later
// sendTelegram: posts to the Bot API sendMessage endpoint, maps non-2xx/errors, and is a
// no-op failure when the channel is unconfigured. undici.fetch is mocked; the bot token is
// stubbed via env and the module re-imported so notifyConfig picks it up.
import { afterEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('undici', async (importOriginal) => {
  const actual = await importOriginal<typeof import('undici')>();
  return { ...actual, fetch: fetchMock };
});

async function freshDeliver(token: string) {
  vi.resetModules();
  vi.stubEnv('TELEGRAM_BOT_TOKEN', token);
  vi.stubEnv('NODE_ENV', 'test');
  return import('../src/deliver.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

describe('sendTelegram', () => {
  it('POSTs chat_id + text to /bot<token>/sendMessage and reports ok on 2xx', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const { sendTelegram } = await freshDeliver('BOTTOKEN');
    expect(await sendTelegram('12345', 'hello')).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.telegram.org/botBOTTOKEN/sendMessage');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string)).toMatchObject({ chat_id: '12345', text: 'hello' });
  });

  it('reports a non-2xx response as an error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const { sendTelegram } = await freshDeliver('BOTTOKEN');
    expect(await sendTelegram('1', 'x')).toEqual({ ok: false, error: 'telegram responded 403' });
  });

  it('maps a transport throw to an error result', async () => {
    fetchMock.mockImplementation(() => {
      throw new Error('network down');
    });
    const { sendTelegram } = await freshDeliver('BOTTOKEN');
    expect(await sendTelegram('1', 'x')).toEqual({ ok: false, error: 'network down' });
  });

  it('is a no-op failure when no bot token is configured (never calls the API)', async () => {
    const { sendTelegram } = await freshDeliver('');
    expect(await sendTelegram('1', 'x')).toEqual({ ok: false, error: 'telegram not configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
