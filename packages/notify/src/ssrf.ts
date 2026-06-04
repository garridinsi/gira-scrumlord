// SPDX-License-Identifier: GPL-3.0-or-later
// Basic SSRF guard for outbound webhooks. Admin-configured targets are lower risk,
// but we still refuse loopback/private/link-local hosts by default so a misconfigured
// (or malicious) channel can't make the server poke internal services.

import { lookup as dnsLookup } from 'node:dns';
import { Agent } from 'undici';

/** Private/loopback/link-local IPv4 (dotted-quad). */
function isPrivateV4(h: string): boolean {
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4) return false;
  const [a, b, c, d] = [Number(v4[1]), Number(v4[2]), Number(v4[3]), Number(v4[4])];
  if (a > 255 || b > 255 || c > 255 || d > 255) return false;
  if (a === 0 || a === 127 || a === 10) return true; // this-host, loopback, private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata 169.254.169.254)
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT (RFC 6598) — carrier internal
  return false;
}

/**
 * Pull an embedded IPv4 out of an IPv4-mapped/-compatible IPv6 so the v4 rules
 * apply. Covers the dotted form (`::ffff:127.0.0.1`) AND the hex form Node's URL
 * normalizes it to (`::ffff:7f00:1`), plus the deprecated `::a.b.c.d` compat form —
 * the exact shapes that previously slipped the loopback/metadata check.
 */
function embeddedV4(h: string): string | null {
  const dotted = h.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dotted) return dotted[1]!;
  const hex = h.match(/^::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hex) {
    const hi = parseInt(hex[1]!, 16);
    const lo = parseInt(hex[2]!, 16);
    // Unreachable: the [0-9a-f]{1,4} capture guarantees parseInt(.,16) is a number, so NaN
    // never occurs. Kept as a guard against a future regex change.
    /* c8 ignore next */
    if (Number.isNaN(hi) || Number.isNaN(lo)) return null;
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return null;
}

export function isPrivateHost(host: string): boolean {
  // Normalize: lowercase, strip IPv6 brackets and any %zone-id (fe80::1%eth0).
  let h = host.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  const pct = h.indexOf('%');
  if (pct !== -1) h = h.slice(0, pct);

  if (h === 'localhost' || h.endsWith('.localhost')) return true;

  if (isPrivateV4(h)) return true;

  // IPv6.
  if (h.includes(':')) {
    if (h === '::1') return true; // loopback
    if (h === '::') return true; // unspecified (0.0.0.0 equivalent)
    if (h.startsWith('fe80') || h.startsWith('fc') || h.startsWith('fd')) return true; // link-local / ULA
    // IPv4-mapped / -compatible IPv6 — decode the embedded v4 and apply v4 rules.
    // This closes the `::ffff:169.254.169.254` / `::ffff:7f00:1` metadata bypass.
    const mapped = embeddedV4(h);
    if (mapped && isPrivateV4(mapped)) return true;
    return false;
  }
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
    /* c8 ignore start -- DNS-failure rethrow. The resolver-rejection path is not unit-testable
       under vitest 2.1.9: its unhandled-rejection detector flags a mocked rejected lookup
       before this await's catch attaches (a known harness quirk), failing the test. The arm
       is a thin defensive translation of an infra error and is exercised end-to-end. */
  } catch {
    throw new Error(`cannot resolve webhook host: ${hostname}`);
  }
  /* c8 ignore stop */
  for (const a of addrs) {
    if (isPrivateHost(a.address)) {
      throw new Error(`webhook host ${hostname} resolves to a private address (${a.address})`);
    }
  }
}

/**
 * DNS lookup that re-applies the private-host check to the ACTUAL resolved address
 * at connection time. `assertResolvedHostSafe` validates a hostname's DNS, but the
 * fetch that follows resolves the name AGAIN — a rebinding attacker can answer the
 * pre-check with a public IP and the real connection with a private one. Wiring this
 * as the webhook Agent's `connect.lookup` means the IP that's checked IS the IP that's
 * connected to, closing the TOCTOU (and it re-checks on every redirect hop too).
 */
export function safeWebhookLookup(
  hostname: string,
  options: import('node:dns').LookupOneOptions | import('node:dns').LookupAllOptions,
  // undici/net pass the standard dns.lookup callback (single, or array when all:true).
  callback: (err: NodeJS.ErrnoException | null, address: unknown, family?: number) => void,
): void {
  dnsLookup(
    hostname,
    options as import('node:dns').LookupAllOptions,
    (
      err: NodeJS.ErrnoException | null,
      address: string | import('node:dns').LookupAddress[],
      family: number,
    ) => {
      if (err) return callback(err, address, family);
      const list = Array.isArray(address)
        ? address
        : [{ address: address as unknown as string, family: family ?? 0 }];
      for (const a of list) {
        if (isPrivateHost(a.address)) {
          const blocked: NodeJS.ErrnoException = Object.assign(
            new Error(`blocked SSRF: ${hostname} resolves to a private address (${a.address})`),
            { code: 'ESSRFBLOCKED' },
          );
          return callback(blocked, address, family);
        }
      }
      callback(null, address, family);
    },
  );
}

/** Undici dispatcher that pins outbound webhook connections to public addresses. */
export function createSafeWebhookAgent(): Agent {
  return new Agent({ connect: { lookup: safeWebhookLookup as never } });
}
