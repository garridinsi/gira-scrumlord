// SPDX-License-Identifier: GPL-3.0-or-later
// Run sauron as its own daemon. Tries the canonical port 666; if it lacks the
// privilege (non-root dev), it honestly says so and retreats to a high port.

import { sauronConfig } from './config.js';
import { buildSauron } from './server.js';

const app = buildSauron();

async function listenOn(port: number): Promise<void> {
  try {
    const address = await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`👁  sauron is watching on ${address}`);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if ((code === 'EACCES' || code === 'EADDRINUSE') && port === sauronConfig.port) {
      app.log.warn(
        `sauron could not bind privileged port ${port} (${code}). ` +
          `Retreating to ${sauronConfig.fallbackPort}. Run with elevated privileges ` +
          `(or in Docker) to claim 666; or set SAURON_PORT.`,
      );
      await listenOn(sauronConfig.fallbackPort);
      return;
    }
    app.log.error(err);
    process.exit(1);
  }
}

void listenOn(sauronConfig.port);
