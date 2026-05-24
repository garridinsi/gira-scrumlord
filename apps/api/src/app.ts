// SPDX-License-Identifier: GPL-3.0-or-later
// The Fastify application factory (the README's "core"). Building the app is
// separate from listening so tests can drive it via `app.inject()`.

import Fastify, { type FastifyInstance } from 'fastify';
import { config } from './config.js';
import { auditRoutes } from './modules/audit/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { boardRoutes } from './modules/board/routes.js';
import { clientRoutes } from './modules/clients/routes.js';
import { intakeRoutes } from './modules/intake/routes.js';
import { issueRoutes } from './modules/issues/routes.js';
import { moneyRoutes } from './modules/money/routes.js';
import { notificationRoutes } from './modules/notifications/routes.js';
import { portalRoutes } from './modules/portal/routes.js';
import { projectRoutes } from './modules/projects/routes.js';
import { sprintRoutes } from './modules/sprints/routes.js';
import { timeRoutes } from './modules/time/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { registerErrorHandler } from './plugins/errors.js';
import { registerSecurity } from './plugins/security.js';
import { healthRoutes } from './routes/health.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.NODE_ENV !== 'test',
    bodyLimit: 2 * 1024 * 1024,
  });

  await registerSecurity(app);
  registerErrorHandler(app);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(clientRoutes);
  await app.register(userRoutes);
  await app.register(projectRoutes);
  await app.register(issueRoutes);
  await app.register(boardRoutes);
  await app.register(sprintRoutes);
  await app.register(timeRoutes);
  await app.register(moneyRoutes);
  await app.register(notificationRoutes);
  await app.register(intakeRoutes);
  await app.register(auditRoutes);
  await app.register(portalRoutes);

  return app;
}
