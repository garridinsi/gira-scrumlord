// SPDX-License-Identifier: GPL-3.0-or-later
// Per-route rate-limit configs (used via Fastify route `config.rateLimit`).
// Limits are relaxed under NODE_ENV=test so the suite can hammer endpoints
// without tripping them; a dedicated test overrides this to assert throttling.

import { config } from '../config.js';

const isTest = config.NODE_ENV === 'test';

/** Sign-in surface: magic-link request + callback. Strict — abuse/brute-force prone. */
export const authRateLimit = {
  max: isTest ? 10_000 : 10,
  timeWindow: '1 minute',
};

/** Unauthenticated inbound webhook (token-authed). Moderate per-source flood guard. */
export const intakeRateLimit = {
  max: isTest ? 10_000 : 120,
  timeWindow: '1 minute',
};
