// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';
import type { FastifyInstance } from 'fastify';
import { APP_VERSION } from '../config.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    let db = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    return { status: db ? 'ok' : 'degraded', db, name: 'gira-scrumlord', version: APP_VERSION };
  });
}
