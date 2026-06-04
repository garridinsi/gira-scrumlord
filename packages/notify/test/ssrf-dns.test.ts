// SPDX-License-Identifier: GPL-3.0-or-later
// Covers ssrf.ts paths the literal-host tests can't reach: the DNS-RESOLUTION rebind guard
// in assertResolvedHostSafe (a public-looking host that resolves to a private IP — the real
// rebinding shape, which the localhost test can't hit because the literal check fires first),
// the single-address lookup branch, the agent factory, and the invalid-URL catch.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const lookupMock = vi.hoisted(() => vi.fn());
vi.mock('node:dns/promises', () => ({ lookup: lookupMock }));

import {
  assertResolvedHostSafe,
  assertSafeWebhookUrl,
  createSafeWebhookAgent,
  isPrivateHost,
  safeWebhookLookup,
} from '../src/ssrf.js';

describe('assertResolvedHostSafe — DNS resolution path (mocked resolver)', () => {
  beforeEach(() => lookupMock.mockReset());

  it('returns immediately for a public IP literal, without resolving', async () => {
    await expect(assertResolvedHostSafe('http://8.8.8.8/x')).resolves.toBeUndefined();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('rejects a public-looking host that resolves to a private address (rebinding)', async () => {
    lookupMock.mockResolvedValue([{ address: '10.0.0.5' }]);
    await expect(assertResolvedHostSafe('http://evil.example.com/x')).rejects.toThrow(
      /private address/,
    );
  });

  it('allows a host that resolves only to public addresses', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.216.34' }]);
    await expect(assertResolvedHostSafe('http://example.com/x')).resolves.toBeUndefined();
  });

  // NOTE: the resolver-rejection ("cannot resolve") arm is c8-ignored in ssrf.ts — vitest
  // 2.1.9's unhandled-rejection detector fails the test on the mocked rejected lookup before
  // the await's catch runs. See the c8-ignore comment in src/ssrf.ts.
});

describe('ssrf misc branches', () => {
  it('assertSafeWebhookUrl rejects a string that is not a URL at all', () => {
    expect(() => assertSafeWebhookUrl('not a url')).toThrow(/not a valid URL/);
  });

  it('treats a genuine public IPv6 (no embedded private v4) as allowed', () => {
    // Exercises embeddedV4 returning null and the non-private IPv6 fall-through.
    expect(isPrivateHost('2001:db8::1')).toBe(false);
    expect(isPrivateHost('[2606:4700:4700::1111]')).toBe(false); // public DNS resolver
  });

  it('flags CGNAT (100.64/10) and strips an IPv6 %zone-id before checking', () => {
    expect(isPrivateHost('100.64.0.1')).toBe(true); // RFC 6598 carrier-internal
    expect(isPrivateHost('100.127.255.255')).toBe(true);
    expect(isPrivateHost('100.63.0.1')).toBe(false); // just below the range → public
    expect(isPrivateHost('fe80::1%eth0')).toBe(true); // zone-id stripped, link-local
  });

  it('rejects a dotted-quad with an out-of-range octet as not-a-private-v4', () => {
    // 256 > 255 → isPrivateV4 bails (not a valid v4); also not localhost/IPv6 → public.
    expect(isPrivateHost('256.1.1.1')).toBe(false);
    expect(isPrivateHost('10.0.0.999')).toBe(false);
  });

  it('safeWebhookLookup handles a single (non-array) resolved address', async () => {
    const res = await new Promise<{ err: NodeJS.ErrnoException | null; address: unknown }>(
      (resolve) => {
        // No `all: true` → node:dns returns a single address string → the non-array branch.
        safeWebhookLookup('8.8.8.8', {}, (err, address) => resolve({ err, address }));
      },
    );
    expect(res.err).toBeNull();
  });

  it('createSafeWebhookAgent returns a usable undici Agent', () => {
    const agent = createSafeWebhookAgent();
    expect(typeof (agent as unknown as { dispatch?: unknown }).dispatch).toBe('function');
  });
});
