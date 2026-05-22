// SPDX-License-Identifier: GPL-3.0-or-later
// One place that turns thrown errors into clean JSON responses.

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error.js';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({ error: 'validation_error', issues: err.issues });
    }
    if (err instanceof HttpError) {
      return reply.status(err.statusCode).send({ error: err.message, details: err.details });
    }
    const e = err as { message?: string; statusCode?: number; validation?: unknown };
    // Fastify's own schema validation, if any route uses it.
    if (e.validation) {
      return reply.status(400).send({ error: 'validation_error', message: e.message });
    }
    req.log.error(err);
    const code = e.statusCode ?? 500;
    if (code >= 500) {
      return reply.status(500).send({ error: 'internal_error' });
    }
    return reply.status(code).send({ error: e.message ?? 'error' });
  });

  app.setNotFoundHandler((req, reply) =>
    reply.status(404).send({ error: 'not_found', path: req.url }),
  );
}
