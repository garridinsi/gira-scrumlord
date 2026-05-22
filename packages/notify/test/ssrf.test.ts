// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { assertSafeWebhookUrl, isPrivateHost } from '../src/ssrf.js';

describe('ssrf guard', () => {
  it('flags loopback, private, and link-local hosts', () => {
    for (const h of ['localhost', '127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.5', '169.254.1.1', '::1']) {
      expect(isPrivateHost(h)).toBe(true);
    }
  });

  it('allows public hosts', () => {
    for (const h of ['example.com', '8.8.8.8', 'hooks.slack.com', '1.2.3.4']) {
      expect(isPrivateHost(h)).toBe(false);
    }
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
});
