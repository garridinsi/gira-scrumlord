// SPDX-License-Identifier: GPL-3.0-or-later
// Vitest config for apps/scrumlord integration tests.
// Uses a DEDICATED test database (gira_scrumlord_test) so this suite never
// clashes with apps/api's gira_test or the dev gira database.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

const here = path.dirname(fileURLToPath(import.meta.url));
// Load repo-root .env for base DATABASE_URL; test-injected env still wins.
loadEnv({ path: path.resolve(here, '../../.env') });

const base =
  process.env['DATABASE_URL'] ?? 'postgresql://gira:gira@127.0.0.1:5432/gira?schema=public';

// Swap db name to gira_scrumlord_test, preserving any query string.
const testUrl = base.replace(/\/([^/?]+)(\?|$)/, '/gira_scrumlord_test$2');

// Make it available in the process and in test.env (picked up by prisma).
process.env['DATABASE_URL'] = testUrl;

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    env: { DATABASE_URL: testUrl, NODE_ENV: 'test' },
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
