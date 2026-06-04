// SPDX-License-Identifier: GPL-3.0-or-later
// Browser Web Push helpers: VAPID key decoding, feature detection, and the subscribe/
// unsubscribe handshake (browser APIs stubbed).
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  pushSupported,
  subscribeBrowser,
  unsubscribeBrowser,
  urlBase64ToUint8Array,
} from '../lib/push';

afterEach(() => vi.unstubAllGlobals());

describe('urlBase64ToUint8Array', () => {
  it('decodes a padded base64url string to bytes', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3]); // "AQID" → 0x01 0x02 0x03
  });

  it('round-trips base64url chars (- _) with missing padding', () => {
    const bytes = [251, 239, 190];
    const b64url = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(Array.from(urlBase64ToUint8Array(b64url))).toEqual(bytes);
  });
});

describe('pushSupported', () => {
  it('is false in jsdom (no PushManager / serviceWorker)', () => {
    expect(pushSupported()).toBe(false);
  });
});

describe('subscribeBrowser / unsubscribeBrowser', () => {
  it('asks permission, subscribes, and returns the mapped subscription', async () => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });
    const subscribe = vi.fn().mockResolvedValue({
      endpoint: 'https://push.test/x',
      toJSON: () => ({ endpoint: 'https://push.test/x', keys: { p256dh: 'pk', auth: 'ak' } }),
    });
    vi.stubGlobal('navigator', {
      serviceWorker: { ready: Promise.resolve({ pushManager: { subscribe } }) },
    });

    expect(await subscribeBrowser('AQID')).toEqual({
      endpoint: 'https://push.test/x',
      keys: { p256dh: 'pk', auth: 'ak' },
    });
    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
  });

  it('throws when notification permission is denied', async () => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('denied') });
    await expect(subscribeBrowser('AQID')).rejects.toThrow(/permission denied/);
  });

  it('unsubscribes and returns the dropped endpoint', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi
              .fn()
              .mockResolvedValue({ endpoint: 'https://push.test/y', unsubscribe }),
          },
        }),
      },
    });
    expect(await unsubscribeBrowser()).toBe('https://push.test/y');
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('returns undefined from unsubscribe when there is no active subscription', async () => {
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: { getSubscription: vi.fn().mockResolvedValue(null) },
        }),
      },
    });
    expect(await unsubscribeBrowser()).toBeUndefined();
  });
});
