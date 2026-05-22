// SPDX-License-Identifier: GPL-3.0-or-later
// Security headers (helmet), CORS for the SPA (with credentials so the session
// cookie is sent), and signed-cookie support.

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

export async function registerSecurity(app: FastifyInstance): Promise<void> {
  // The API returns JSON only; a CSP would just get in the SPA's way.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: config.APP_URL, credentials: true });
  await app.register(cookie, { secret: config.SESSION_SECRET });
}
