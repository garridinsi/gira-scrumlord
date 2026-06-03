// SPDX-License-Identifier: GPL-3.0-or-later
// Push Prisma schema to gira_scrumlord_test before any suite runs.
// DATABASE_URL is already set to the test DB by vitest.config.ts.
//
// Uses execFileSync (no shell) with a fixed argv — no user input, no injection risk.

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default function setup(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dbDir = path.resolve(here, '../../../packages/db');

  execFileSync('pnpm', ['exec', 'prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], {
    cwd: dbDir,
    stdio: 'inherit',
    env: process.env, // DATABASE_URL points at gira_scrumlord_test
  });
}
