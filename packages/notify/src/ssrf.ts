// SPDX-License-Identifier: GPL-3.0-or-later
// Basic SSRF guard for outbound webhooks. Admin-configured targets are lower risk,
// but we still refuse loopback/private/link-local hosts by default so a misconfigured
// (or malicious) channel can't make the server poke internal services.

export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;

  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 127 || a === 10) return true; // this-host, loopback, private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local
    return false;
  }

  // IPv6 loopback / link-local / unique-local
  if (h === '::1' || h === '[::1]') return true;
  const bare = h.replace(/^\[|\]$/g, '');
  if (bare.startsWith('fe80') || bare.startsWith('fc') || bare.startsWith('fd')) return true;
  return false;
}

export function assertSafeWebhookUrl(raw: string, allowPrivate = false): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('webhook target is not a valid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('webhook target must be http(s)');
  }
  if (!allowPrivate && isPrivateHost(url.hostname)) {
    throw new Error(`refusing to call private/loopback host: ${url.hostname}`);
  }
}

/**
 * Stronger guard used at DELIVERY time: the literal-hostname check above can be
 * bypassed by a domain whose DNS resolves to an internal IP (DNS rebinding), so
 * here we actually resolve the hostname and reject if ANY returned address is
 * private/loopback/link-local. Closes the rebind gap for outbound webhooks.
 */
export async function assertResolvedHostSafe(raw: string, allowPrivate = false): Promise<void> {
  assertSafeWebhookUrl(raw, allowPrivate);
  if (allowPrivate) return;
  const { hostname } = new URL(raw);
  // IP literals were already validated by assertSafeWebhookUrl → isPrivateHost.
  const isIpLiteral = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
  if (isIpLiteral) return;
  const { lookup } = await import('node:dns/promises');
  let addrs: Array<{ address: string }>;
  try {
    addrs = await lookup(hostname, { all: true });
  } catch {
    throw new Error(`cannot resolve webhook host: ${hostname}`);
  }
  for (const a of addrs) {
    if (isPrivateHost(a.address)) {
      throw new Error(`webhook host ${hostname} resolves to a private address (${a.address})`);
    }
  }
}
