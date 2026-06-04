// SPDX-License-Identifier: GPL-3.0-or-later
// currentUser is a pure request->user accessor, so it is unit-tested directly (no
// buildApp): in a real route it always runs behind requireAuth, which sets req.user,
// so the missing-user arm (line 25) is only reachable by calling it with an
// unauthenticated request. We exercise both arms by faking the only field it reads.
import type { AuthUser } from '../src/lib/auth.js';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { currentUser } from '../src/lib/auth.js';
import { HttpError } from '../src/lib/http-error.js';

const reqWith = (user: AuthUser | undefined): FastifyRequest =>
  ({ user }) as unknown as FastifyRequest;

const staffUser: AuthUser = {
  id: 'u1',
  email: 'u1@example.com',
  name: 'User One',
  kind: 'staff',
  role: 'admin',
  clientId: null,
  locale: 'both',
};

describe('cov src/lib/auth.ts', () => {
  it('throws 401 unauthorized when req.user is absent (line 25)', () => {
    expect(() => currentUser(reqWith(undefined))).toThrow(HttpError);
    try {
      currentUser(reqWith(undefined));
      expect.unreachable('currentUser should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).statusCode).toBe(401);
    }
  });

  it('returns the request user when present (line 26)', () => {
    expect(currentUser(reqWith(staffUser))).toBe(staffUser);
  });
});
