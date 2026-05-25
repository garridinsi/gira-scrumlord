// SPDX-License-Identifier: GPL-3.0-or-later
// Security headers (helmet), CORS for the SPA (with credentials so the session
// cookie is sent), and signed-cookie support.

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { forbidden } from '../lib/http-error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function registerSecurity(app: FastifyInstance): Promise<void> {
  // The API returns JSON only; a CSP would just get in the SPA's way.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: config.APP_URL, credentials: true });
  await app.register(cookie, { secret: config.SESSION_SECRET });

  // CSRF defense for cookie-authenticated mutations: a browser always sends an
  // Origin header on state-changing requests, so if one is present and isn't our
  // own app, refuse it. Server-to-server callers (the token-authed intake webhook,
  // curl) send no Origin and are unaffected; same-origin SPA calls match APP_URL.
  app.addHook('onRequest', async (req) => {
    if (SAFE_METHODS.has(req.method)) return;
    if (req.url.startsWith('/intake/')) return; // bearer-token auth, not cookie
    const origin = req.headers.origin;
    if (origin && origin !== config.APP_URL) {
      throw forbidden('cross-origin request refused');
    }
  });
}
