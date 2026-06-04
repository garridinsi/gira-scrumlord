// SPDX-License-Identifier: GPL-3.0-or-later
// config.ts is evaluated once at import from the ambient env, so the SMTP-auth branch only
// runs when both credentials are present. Re-import a fresh copy under stubbed env to cover
// both shapes (auth+TLS when credentialed; bare transport otherwise).
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function freshConfig() {
  vi.resetModules();
  return (await import('../src/config.js')).notifyConfig;
}

describe('notifyConfig SMTP auth branch', () => {
  it('adds auth + forced TLS when both SMTP_USER and SMTP_PASS are set on a non-secure port', async () => {
    vi.stubEnv('SMTP_USER', 'relay-user');
    vi.stubEnv('SMTP_PASS', 'relay-pass');
    vi.stubEnv('SMTP_SECURE', 'false');
    // Also set the host/port/from so their `?? default` left-hand (env-present) branches run.
    vi.stubEnv('SMTP_HOST', 'smtp-relay.example');
    vi.stubEnv('SMTP_PORT', '587');
    vi.stubEnv('MAIL_FROM', 'ops <ops@example.test>');
    const cfg = await freshConfig();
    expect(cfg.smtp).toMatchObject({
      host: 'smtp-relay.example',
      port: 587,
      auth: { user: 'relay-user', pass: 'relay-pass' },
      requireTLS: true, // STARTTLS on a non-secure port
      tls: { minVersion: 'TLSv1.2' },
    });
    expect(cfg.mailFrom).toBe('ops <ops@example.test>');
  });

  it('omits requireTLS on an implicitly-secure port but still authenticates', async () => {
    vi.stubEnv('SMTP_USER', 'u');
    vi.stubEnv('SMTP_PASS', 'p');
    vi.stubEnv('SMTP_SECURE', 'true');
    const cfg = await freshConfig();
    expect(cfg.smtp).toMatchObject({ auth: { user: 'u', pass: 'p' }, requireTLS: false });
  });

  it('sends no auth block when credentials are absent', async () => {
    vi.stubEnv('SMTP_USER', '');
    vi.stubEnv('SMTP_PASS', '');
    const cfg = await freshConfig();
    expect('auth' in cfg.smtp).toBe(false);
  });
});
