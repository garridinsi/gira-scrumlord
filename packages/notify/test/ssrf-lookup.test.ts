// SPDX-License-Identifier: GPL-3.0-or-later
// safeWebhookLookup's resolver-error and single-address (no family) branches, exercised by
// mocking node:dns directly so we don't depend on real DNS. (The happy/blocked paths against
// the real resolver live in ssrf.test.ts.)
import { describe, expect, it, vi } from 'vitest';

const dnsLookupMock = vi.hoisted(() => vi.fn());
vi.mock('node:dns', () => ({ lookup: dnsLookupMock }));

import { safeWebhookLookup } from '../src/ssrf.js';

const run = (host: string) =>
  new Promise<{ err: NodeJS.ErrnoException | null; address: unknown }>((resolve) => {
    safeWebhookLookup(host, { all: true }, (err, address) => resolve({ err, address }));
  });

describe('safeWebhookLookup — mocked resolver branches', () => {
  it('forwards a resolver error untouched', async () => {
    dnsLookupMock.mockImplementation((_h: string, _o: unknown, cb: (...a: unknown[]) => void) =>
      cb(new Error('EAI_AGAIN'), undefined, 0),
    );
    const { err } = await run('flaky.example.com');
    expect(err).toBeTruthy();
    expect(err?.message).toContain('EAI_AGAIN');
  });

  it('handles a single public address with no family field (family ?? 0)', async () => {
    dnsLookupMock.mockImplementation((_h: string, _o: unknown, cb: (...a: unknown[]) => void) =>
      cb(null, '1.2.3.4', undefined),
    );
    const { err } = await run('public.example.com');
    expect(err).toBeNull();
  });

  it('blocks a single private address returned without an array', async () => {
    dnsLookupMock.mockImplementation((_h: string, _o: unknown, cb: (...a: unknown[]) => void) =>
      cb(null, '10.0.0.7', 4),
    );
    const { err } = await run('rebind.example.com');
    expect(err?.code).toBe('ESSRFBLOCKED');
  });
});
