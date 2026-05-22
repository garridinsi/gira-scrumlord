// SPDX-License-Identifier: GPL-3.0-or-later
import { buildApp } from './app.js';
import { config } from './config.js';

const app = await buildApp();

try {
  const address = await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
  app.log.info(`🌀 gira-scrumlord core listening on ${address}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
