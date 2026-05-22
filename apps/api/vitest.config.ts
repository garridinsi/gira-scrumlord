// SPDX-License-Identifier: GPL-3.0-or-later
// Integration tests run against a dedicated `gira_test` database on the same
// Postgres, so they never touch dev data. globalSetup applies the schema.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, '../../.env') });

const base =
  process.env.DATABASE_URL ?? 'postgresql://gira:gira@localhost:5432/gira?schema=public';
// Swap the database name to gira_test, preserving any query string.
const testUrl = base.replace(/\/([^/?]+)(\?|$)/, '/gira_test$2');
process.env.DATABASE_URL = testUrl;

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    env: { DATABASE_URL: testUrl, NODE_ENV: 'test' },
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
