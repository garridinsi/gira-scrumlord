// SPDX-License-Identifier: GPL-3.0-or-later
// Integration tests run against a dedicated `gira_test` database on the same
// Postgres, so they never touch dev data. globalSetup applies the schema.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, '../../.env') });

const base = process.env.DATABASE_URL ?? 'postgresql://gira:gira@127.0.0.1:5432/gira?schema=public';
// Swap the database name to gira_test, preserving any query string.
const testUrl = base.replace(/\/([^/?]+)(\?|$)/, '/gira_test$2');
process.env.DATABASE_URL = testUrl;

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    // A dummy bot token turns the Telegram channel ON for tests (so the link endpoints are
    // reachable). The VAPID keys (a throwaway, real-format keypair) turn Web Push ON. Safe:
    // the API never drains the Outbox, so no test actually sends — only scrumlord's dispatch
    // path would, and that is unit-tested separately. Real-format keys are required because
    // web-push.setVapidDetails validates them at module load.
    env: {
      DATABASE_URL: testUrl,
      NODE_ENV: 'test',
      TELEGRAM_BOT_TOKEN: 'test-bot-token',
      VAPID_PUBLIC_KEY:
        'BDY0j1s7_1xgpWUK5ZUC8K0xumkxB4AP2RJxkKZqujPwv5JptU34NFuIjo_YNzAu6RgAxTCDsO9BIACL9H26XoM',
      VAPID_PRIVATE_KEY: 't928DeLDTPEmuVHUPiTui3dHRPbW5hwLPu3CaIvBH-E',
      VAPID_SUBJECT: 'mailto:test@gira.local',
    },
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 60_000,
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      // server.ts is the bare listen() entrypoint (not exercised by app.inject); type
      // decls aren't executable targets.
      exclude: ['src/server.ts', 'src/**/*.d.ts'],
    },
  },
});
