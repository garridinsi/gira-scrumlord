// SPDX-License-Identifier: GPL-3.0-or-later
// Covers the `?? 'error'` fallback on the final passthrough arm of the error
// handler (src/plugins/errors.ts:38): a thrown error carrying a <500 statusCode
// but no message. The existing errors.test.ts /teapot case exercises the
// message-present side; this exercises the nullish fallback.
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { registerErrorHandler } from '../src/plugins/errors.js';

describe('cov src/plugins/errors.ts', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = Fastify();
    registerErrorHandler(app);
    app.get('/no-message', () => {
      // A bare object with a <500 statusCode and no message → e.message is
      // undefined → the handler falls back to the literal 'error'.
      const e: { statusCode: number } = { statusCode: 422 };
      throw e;
    });
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it("falls back to 'error' for a <500 throw with no message", async () => {
    const res = await app.inject({ method: 'GET', url: '/no-message' });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'error' });
  });
});
