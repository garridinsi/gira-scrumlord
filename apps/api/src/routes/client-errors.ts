// SPDX-License-Identifier: GPL-3.0-or-later
// A small sink for browser runtime crashes caught by the web ErrorBoundary, so a
// render fault that the user never reports still lands in the server log. It is
// public (faults happen pre-auth, e.g. on the login page) and therefore strictly
// rate-limited and size-capped, and it never argues with a crash reporter — a
// malformed body is swallowed as 204, not a 400 the reporter would ignore anyway.

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { clientErrorRateLimit } from '../lib/rate-limits.js';

const clientErrorSchema = z.object({
  message: z.string().max(2000),
  stack: z.string().max(8000).optional(),
  componentStack: z.string().max(8000).optional(),
  url: z.string().max(2000).optional(),
});

export async function clientErrorRoutes(app: FastifyInstance): Promise<void> {
  app.post('/client-errors', { config: { rateLimit: clientErrorRateLimit } }, async (req, reply) => {
    const parsed = clientErrorSchema.safeParse(req.body);
    if (parsed.success) {
      req.log.warn({ clientError: parsed.data }, 'web runtime error (ErrorBoundary)');
    }
    return reply.code(204).send();
  });
}
