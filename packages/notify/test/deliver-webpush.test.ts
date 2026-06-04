// SPDX-License-Identifier: GPL-3.0-or-later
// sendWebPush: signs+encrypts via the web-push lib, maps a 404/410 to `gone` (prune), other
// errors to a plain failure, and is a no-op when unconfigured. The library is mocked; VAPID
// keys are stubbed via env and the module re-imported so notifyConfig picks them up.
import { afterEach, describe, expect, it, vi } from 'vitest';

const sendNotification = vi.hoisted(() => vi.fn());
const setVapidDetails = vi.hoisted(() => vi.fn());
vi.mock('web-push', () => ({ default: { setVapidDetails, sendNotification } }));

async function freshDeliver(enabled: boolean) {
  vi.resetModules();
  vi.stubEnv('VAPID_PUBLIC_KEY', enabled ? 'PUBKEY' : '');
  vi.stubEnv('VAPID_PRIVATE_KEY', enabled ? 'PRIVKEY' : '');
  vi.stubEnv('NODE_ENV', 'test');
  return import('../src/deliver.js');
}

const sub = { endpoint: 'https://push.example/abc', p256dh: 'p', auth: 'a' };

afterEach(() => {
  vi.unstubAllEnvs();
  sendNotification.mockReset();
});

describe('sendWebPush', () => {
  it('sends the encrypted JSON payload and reports ok', async () => {
    sendNotification.mockResolvedValue({ statusCode: 201 });
    const { sendWebPush } = await freshDeliver(true);
    expect(await sendWebPush(sub, { title: 'Hi', body: 'there' })).toEqual({ ok: true });
    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: sub.endpoint, keys: { p256dh: 'p', auth: 'a' } },
      JSON.stringify({ title: 'Hi', body: 'there' }),
    );
  });

  it('flags a 410 Gone subscription for pruning', async () => {
    sendNotification.mockImplementation(() => {
      throw Object.assign(new Error('gone'), { statusCode: 410 });
    });
    const { sendWebPush } = await freshDeliver(true);
    const r = await sendWebPush(sub, { title: 'x', body: 'y' });
    expect(r.ok).toBe(false);
    expect(r.gone).toBe(true);
  });

  it('treats a non-404/410 failure as a transient error (not gone)', async () => {
    sendNotification.mockImplementation(() => {
      throw Object.assign(new Error('boom'), { statusCode: 500 });
    });
    const { sendWebPush } = await freshDeliver(true);
    const r = await sendWebPush(sub, { title: 'x', body: 'y' });
    expect(r.ok).toBe(false);
    expect(r.gone).toBe(false);
    expect(r.error).toContain('boom');
  });

  it('is a no-op failure when VAPID keys are not configured', async () => {
    const { sendWebPush } = await freshDeliver(false);
    expect(await sendWebPush(sub, { title: 'x', body: 'y' })).toEqual({
      ok: false,
      error: 'web push not configured',
    });
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
