// SPDX-License-Identifier: GPL-3.0-or-later
// config.ts validates env once at module load; its production-only guards never fire
// under NODE_ENV=test. Re-import it in isolation with a mocked env to exercise them.
// dotenv is stubbed to a no-op so the repo .env can't bleed into these assertions.
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('dotenv', () => ({ config: () => ({ parsed: {} }) }));

const ORIGINAL = { ...process.env };
function restoreEnv(): void {
  for (const k of Object.keys(process.env)) if (!(k in ORIGINAL)) delete process.env[k];
  Object.assign(process.env, ORIGINAL);
}

describe('config env validation', () => {
  afterEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  it('throws in production when SESSION_SECRET is still the insecure default', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'dev-only-insecure-change-me-xxxx';
    vi.resetModules();
    await expect(import('../src/config.js')).rejects.toThrow(/insecure default/i);
  });

  it('defaults COOKIE_SECURE to true in production when unset', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'a-strong-unique-production-secret';
    delete process.env.COOKIE_SECURE;
    vi.resetModules();
    const { config } = await import('../src/config.js');
    expect(config.COOKIE_SECURE).toBe(true);
  });

  it('honors an explicit COOKIE_SECURE override even in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'a-strong-unique-production-secret';
    process.env.COOKIE_SECURE = 'false';
    vi.resetModules();
    const { config } = await import('../src/config.js');
    expect(config.COOKIE_SECURE).toBe(false);
  });
});
