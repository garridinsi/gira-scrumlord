// SPDX-License-Identifier: GPL-3.0-or-later
// Loads repo-root .env and exposes DATABASE_URL for the scrumlord daemon.
// dotenv does NOT override already-set vars, so a test-injected DATABASE_URL
// (e.g. pointing at gira_scrumlord_test) always wins over the dev value.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
// apps/scrumlord/src -> repo root is three levels up.
loadEnv({ path: path.resolve(here, '../../../.env') });

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set — cannot start scrumlord daemon');
}

export const DATABASE_URL: string = databaseUrl;
