// SPDX-License-Identifier: GPL-3.0-or-later
// The per-route limits are `isTest ? relaxed : strict`. The whole suite runs with
// isTest=true (relaxed side), so the production (strict) side of each ternary is never
// taken. Re-import under a non-test env to exercise it and lock the real prod numbers.
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('dotenv', () => ({ config: () => ({ parsed: {} }) }));

const ORIGINAL = { ...process.env };

describe('rate-limits (production values)', () => {
  afterEach(() => {
    for (const k of Object.keys(process.env)) if (!(k in ORIGINAL)) delete process.env[k];
    Object.assign(process.env, ORIGINAL);
    vi.resetModules();
  });

  it('uses the strict production limits when not under test', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SESSION_SECRET = 'a-strong-unique-production-secret';
    vi.resetModules();
    const { authRateLimit, intakeRateLimit, clientErrorRateLimit } =
      await import('../src/lib/rate-limits.js');
    expect(authRateLimit.max).toBe(10);
    expect(intakeRateLimit.max).toBe(120);
    expect(clientErrorRateLimit.max).toBe(30);
  });
});
