// SPDX-License-Identifier: GPL-3.0-or-later
// Push the Prisma schema to the test database once before the suite runs.
// `prisma db push` creates the database if it doesn't exist — no psql/pg needed.
//
// Uses execFileSync (no shell) with a fixed argv: there is no user input here,
// and avoiding a shell removes any possibility of command injection.

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default function setup(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dbDir = path.resolve(here, '../../../packages/db');
  execFileSync('pnpm', ['exec', 'prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], {
    cwd: dbDir,
    stdio: 'inherit',
    env: process.env, // DATABASE_URL is already the gira_test url (set in vitest.config)
  });
}
