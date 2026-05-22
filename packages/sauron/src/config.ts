// SPDX-License-Identifier: GPL-3.0-or-later
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, '../../../.env') });

export const sauronConfig = {
  /** The canonical port. The README is not joking about this one. */
  port: Number(process.env.SAURON_PORT ?? 666),
  /** Where the eye retreats to when it lacks the privilege to bind 666. */
  fallbackPort: Number(process.env.SAURON_FALLBACK_PORT ?? 6660),
};
