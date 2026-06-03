// SPDX-License-Identifier: GPL-3.0-or-later
// The production SMTP transport (and its auth/forced-TLS logic) never builds under
// NODE_ENV=test (which takes the jsonTransport path). Re-import the module under a
// non-test env with nodemailer mocked to assert the transport is configured correctly.
import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  createTransport: vi.fn(() => ({ sendMail: vi.fn(async () => ({ messageId: 'x' })) })),
}));
vi.mock('nodemailer', () => ({ default: { createTransport: h.createTransport } }));
vi.mock('dotenv', () => ({ config: () => ({ parsed: {} }) }));

const ORIGINAL = { ...process.env };
function restoreEnv(): void {
  for (const k of Object.keys(process.env)) if (!(k in ORIGINAL)) delete process.env[k];
  Object.assign(process.env, ORIGINAL);
}

async function loadMailer(env: Record<string, string>) {
  process.env.NODE_ENV = 'development'; // non-test → builds the real transport
  process.env.SESSION_SECRET = 'a-strong-unique-production-secret';
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  vi.resetModules();
  h.createTransport.mockClear();
  return import('../src/modules/auth/mailer.js');
}

describe('mailer transport', () => {
  afterEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  it('builds a plain SMTP transport (no auth) when credentials are absent', async () => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    const m = await loadMailer({ SMTP_HOST: 'smtp.example.test', SMTP_PORT: '587' });
    const arg = h.createTransport.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg).toMatchObject({ host: 'smtp.example.test', port: 587 });
    expect(arg.auth).toBeUndefined();
    await m.sendMagicLink('a@b.test', 'https://x/y'); // exercises sendMail
    expect(h.createTransport).toHaveBeenCalledTimes(1);
  });

  it('adds auth + forced TLS when SMTP credentials are present', async () => {
    const m = await loadMailer({
      SMTP_USER: 'user@x',
      SMTP_PASS: 'secret',
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
    });
    const arg = h.createTransport.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.auth).toEqual({ user: 'user@x', pass: 'secret' });
    expect(arg.requireTLS).toBe(true);
    expect(arg.tls).toEqual({ minVersion: 'TLSv1.2' });
    await m.sendEmailChangeVerification('new@b.test', 'https://x/z');
  });

  it('uses jsonTransport under NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'test';
    process.env.SESSION_SECRET = 'a-strong-unique-production-secret';
    vi.resetModules();
    h.createTransport.mockClear();
    await import('../src/modules/auth/mailer.js');
    expect(h.createTransport).toHaveBeenCalledWith({ jsonTransport: true });
  });
});
