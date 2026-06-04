// SPDX-License-Identifier: GPL-3.0-or-later
// Browser-side Web Push helpers: feature detection, the VAPID key conversion, and the
// subscribe/unsubscribe handshake with the service worker's PushManager. Kept out of the
// component so the (browser-only) plumbing is isolable and unit-testable with mocks.

/** True only when the browser can actually do Web Push (false under jsdom/older browsers). */
export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** VAPID public key (base64url) → the Uint8Array applicationServerKey PushManager expects. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export interface BrowserPushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Ask permission, then subscribe this browser to push with the server's VAPID key. Returns the
 * subscription in the shape the API expects. Throws if permission is denied.
 */
export async function subscribeBrowser(publicKey: string): Promise<BrowserPushSub> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('notification permission denied');
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    // A Uint8Array IS a BufferSource; the cast bridges TS 5.9's stricter ArrayBufferLike generic.
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  return {
    endpoint: json.endpoint ?? sub.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
  };
}

/** Unsubscribe this browser from push; returns the dropped endpoint (for the server DELETE). */
export async function unsubscribeBrowser(): Promise<string | undefined> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return undefined;
  const { endpoint } = sub;
  await sub.unsubscribe();
  return endpoint;
}
