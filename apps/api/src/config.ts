// SPDX-License-Identifier: GPL-3.0-or-later
// Environment config, validated once at startup. Loads the repo-root .env so the
// API works the same whether launched via pnpm, tsx, or vitest.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
// apps/api/src -> repo root. dotenv does NOT override already-set vars, so a
// test-injected DATABASE_URL wins over the dev value here.
loadEnv({ path: path.resolve(here, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  SAURON_PORT: z.coerce.number().int().positive().default(666),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 chars'),
  // Set true when served over HTTPS (prod behind TLS). Decoupled from NODE_ENV so a
  // plain-HTTP `docker compose up` demo can still set the session cookie.
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  // Per-account cooldown (seconds) between minting magic links / email-change tokens
  // for the same address — caps an IP-rotating attacker from email-bombing a victim,
  // independent of the IP-keyed rate limit. The endpoints still return 202/202-style
  // responses, so this leaks nothing about whether the account exists. 0 disables it.
  MAGIC_LINK_COOLDOWN_SECONDS: z.coerce.number().int().min(0).default(60),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  // Optional SMTP auth — set both for an authenticated relay (e.g. Gmail:
  // SMTP_USER=info@example.com, SMTP_PASS=<app password>). Left blank for the dev
  // Mailpit relay, which needs no auth.
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('gira-scrumlord <no-reply@gira.local>'),
  // IANA timezone used to bucket worklogs into calendar months for the monthly
  // maintenance rollup + billing. Defaults to the maintainer's locale; self-hosters
  // in other regions should set this so late-night work lands in the right month.
  BILLING_TIMEZONE: z.string().default('Europe/Madrid'),
  // Number of trusted reverse-proxy hops in front of the API, so `req.ip` is the
  // real client (rate-limiting + audit). 1 = single nginx (local compose); behind a
  // cloudflared tunnel + nginx set 2. Never higher than your real proxy depth, or
  // X-Forwarded-For becomes spoofable.
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
});

const parsed = envSchema.parse(process.env);

// The insecure placeholders shipped in .env.example / docker-compose all start
// with this marker and satisfy the 16-char minimum, so without this guard a
// production deploy that forgets to set SESSION_SECRET would sign session cookies
// with a publicly-known key. Match the marker, not an exact string.
if (
  parsed.NODE_ENV === 'production' &&
  parsed.SESSION_SECRET.startsWith('dev-only-insecure-change-me')
) {
  throw new Error(
    'SESSION_SECRET is still an insecure default — set a strong unique secret before deploying to production.',
  );
}

export const config = {
  ...parsed,
  // Secure cookies default ON in production (unless explicitly overridden), so a
  // deploy that forgets to set COOKIE_SECURE doesn't ship the session cookie over
  // plain HTTP. Dev/test stay false so plain-HTTP localhost still works.
  COOKIE_SECURE:
    process.env.COOKIE_SECURE != null ? parsed.COOKIE_SECURE : parsed.NODE_ENV === 'production',
};
export const APP_VERSION = '0.1.0';
export type AppConfig = typeof config;
