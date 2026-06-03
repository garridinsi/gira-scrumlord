// SPDX-License-Identifier: GPL-3.0-or-later
// The error handler is wired into buildApp but its Prisma/validation/5xx arms rarely
// fire through real routes (most routes pre-check and 404 themselves). Mount it on a
// throwaway app and throw each error type directly so every branch is exercised.
import { Prisma } from '@gira/db';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { badRequest } from '../src/lib/http-error.js';
import { registerErrorHandler } from '../src/plugins/errors.js';

const knownError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('prisma boom', { code, clientVersion: 'test', meta });

describe('error handler', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = Fastify();
    registerErrorHandler(app);
    app.get('/zod', () => {
      throw new ZodError([]);
    });
    app.get('/http', () => {
      throw badRequest('bad input', { field: 'x' });
    });
    app.get('/p2002', () => {
      throw knownError('P2002', { target: ['email'] });
    });
    app.get('/p2025', () => {
      throw knownError('P2025');
    });
    app.get('/p2003', () => {
      throw knownError('P2003');
    });
    app.get('/p-other', () => {
      throw knownError('P2034'); // a known Prisma code we don't special-case → falls through to 500
    });
    app.get('/validation', () => {
      throw Object.assign(new Error('querystring must be object'), {
        validation: [{ message: 'x' }],
      });
    });
    app.get('/boom', () => {
      throw new Error('kaboom'); // no statusCode → 500 internal_error
    });
    app.get('/teapot', () => {
      throw Object.assign(new Error("I'm a teapot"), { statusCode: 418 }); // <500 passthrough
    });
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  const get = (url: string) => app.inject({ method: 'GET', url });

  it('maps a ZodError to 400 validation_error', async () => {
    const res = await get('/zod');
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation_error');
  });

  it('maps an HttpError to its status + message + details', async () => {
    const res = await get('/http');
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'bad input', details: { field: 'x' } });
  });

  it('maps Prisma P2002 to 409 already_exists with target', async () => {
    const res = await get('/p2002');
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: 'already_exists', target: ['email'] });
  });

  it('maps Prisma P2025 to 404 not_found', async () => {
    const res = await get('/p2025');
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('not_found');
  });

  it('maps Prisma P2003 to 409 in_use', async () => {
    const res = await get('/p2003');
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('in_use');
  });

  it('falls through to 500 for an un-special-cased Prisma code', async () => {
    const res = await get('/p-other');
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe('internal_error');
  });

  it("maps Fastify's own validation error to 400", async () => {
    const res = await get('/validation');
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'validation_error' });
  });

  it('maps an unexpected throw to 500 internal_error (no detail leak)', async () => {
    const res = await get('/boom');
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'internal_error' });
  });

  it('passes a <500 statusCode error through with its message', async () => {
    const res = await get('/teapot');
    expect(res.statusCode).toBe(418);
    expect(res.json().error).toBe("I'm a teapot");
  });

  it('serves the not-found handler for an unknown route', async () => {
    const res = await get('/no-such-route');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'not_found', path: '/no-such-route' });
  });
});
