// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';
import type { FastifyInstance } from 'fastify';
import { APP_VERSION } from '../config.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_req, reply) => {
    let db = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch (err) {
      // A masked DB failure that still returns 200 defeats the probe — log it and
      // signal unhealthy so load balancers / uptime checks actually react.
      app.log.error({ err }, 'health check: database unreachable');
      db = false;
    }
    const body = {
      status: db ? 'ok' : 'degraded',
      db,
      name: 'gira-scrumlord',
      version: APP_VERSION,
    };
    return db ? body : reply.code(503).send(body);
  });
}
