// SPDX-License-Identifier: GPL-3.0-or-later
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, '../../.env') });

const base =
  process.env.DATABASE_URL ?? 'postgresql://gira:gira@localhost:5432/gira?schema=public';
const testUrl = base.replace(/\/([^/?]+)(\?|$)/, '/gira_notify_test$2');
process.env.DATABASE_URL = testUrl;

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    // ALLOW_PRIVATE_WEBHOOKS so the local webhook-delivery test can hit 127.0.0.1.
    env: { DATABASE_URL: testUrl, NODE_ENV: 'test', ALLOW_PRIVATE_WEBHOOKS: 'true' },
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 60_000,
  },
});
