// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import {
  assertResolvedHostSafe,
  assertSafeWebhookUrl,
  isPrivateHost,
  safeWebhookLookup,
} from '../src/ssrf.js';

describe('ssrf guard', () => {
  it('flags loopback, private, and link-local hosts', () => {
    for (const h of [
      'localhost',
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '192.168.1.5',
      '169.254.1.1',
      '::1',
    ]) {
      expect(isPrivateHost(h)).toBe(true);
    }
  });

  it('allows public hosts', () => {
    for (const h of ['example.com', '8.8.8.8', 'hooks.slack.com', '1.2.3.4']) {
      expect(isPrivateHost(h)).toBe(false);
    }
  });

  it('flags IPv4-mapped/-compatible IPv6 that embed a private/metadata address', () => {
    // Both the dotted form and the hex form Node's URL normalizes it to.
    for (const h of [
      '::ffff:127.0.0.1',
      '[::ffff:127.0.0.1]',
      '::ffff:7f00:1', // == 127.0.0.1
      '::ffff:169.254.169.254', // cloud metadata
      '[::ffff:a9fe:a9fe]', // == 169.254.169.254
      '::ffff:10.0.0.1',
      '::ffff:0a00:0001', // == 10.0.0.1
      '::', // unspecified
      'fe80::1', // link-local
    ]) {
      expect(isPrivateHost(h)).toBe(true);
    }
  });

  it('rejects mapped-IPv6 metadata literals through the URL guards (write + delivery time)', async () => {
    expect(() =>
      assertSafeWebhookUrl('http://[::ffff:169.254.169.254]/latest/meta-data/'),
    ).toThrow();
    expect(() => assertSafeWebhookUrl('http://[::ffff:127.0.0.1]/hook')).toThrow();
    await expect(
      assertResolvedHostSafe('http://[::ffff:169.254.169.254]/latest'),
    ).rejects.toThrow();
  });

  it('rejects private targets by default and non-http schemes', () => {
    expect(() => assertSafeWebhookUrl('http://127.0.0.1/x')).toThrow();
    expect(() => assertSafeWebhookUrl('http://localhost:9000/hook')).toThrow();
    expect(() => assertSafeWebhookUrl('file:///etc/passwd')).toThrow();
    expect(() => assertSafeWebhookUrl('ftp://example.com')).toThrow();
  });

  it('permits public https and private-when-allowed', () => {
    expect(() => assertSafeWebhookUrl('https://hooks.example.com/x')).not.toThrow();
    expect(() => assertSafeWebhookUrl('http://127.0.0.1/x', true)).not.toThrow();
  });

  describe('assertResolvedHostSafe (DNS-rebinding guard)', () => {
    it('rejects IP-literal private targets and bad schemes without DNS', async () => {
      await expect(assertResolvedHostSafe('http://169.254.169.254/latest')).rejects.toThrow();
      await expect(assertResolvedHostSafe('http://127.0.0.1/hook')).rejects.toThrow();
      await expect(assertResolvedHostSafe('ftp://example.com')).rejects.toThrow();
    });

    it('rejects a hostname that resolves to a private address', async () => {
      // localhost resolves to 127.0.0.1/::1 — a stand-in for any rebinding domain.
      await expect(assertResolvedHostSafe('http://localhost:9000/hook')).rejects.toThrow();
    });

    it('short-circuits to allowed when allowPrivate is set', async () => {
      await expect(assertResolvedHostSafe('http://127.0.0.1/x', true)).resolves.toBeUndefined();
    });
  });

  describe('safeWebhookLookup (connect-time pin — closes the rebind TOCTOU)', () => {
    const lookupAsync = (host: string) =>
      new Promise<{ err: NodeJS.ErrnoException | null; address: unknown }>((resolve) => {
        safeWebhookLookup(host, { all: true }, (err, address) => resolve({ err, address }));
      });

    it('errors when the resolved address is private/loopback', async () => {
      const { err } = await lookupAsync('localhost'); // → 127.0.0.1 / ::1
      expect(err).toBeTruthy();
      expect(err?.code).toBe('ESSRFBLOCKED');
    });

    it('passes a public address straight through', async () => {
      const { err, address } = await lookupAsync('8.8.8.8');
      expect(err).toBeNull();
      expect(JSON.stringify(address)).toContain('8.8.8.8');
    });
  });
});
