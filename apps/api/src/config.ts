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
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  MAIL_FROM: z.string().default('gira-scrumlord <no-reply@gira.local>'),
});

export const config = envSchema.parse(process.env);
export const APP_VERSION = '0.1.0';
export type AppConfig = typeof config;
