// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import * as mailer from '../src/modules/auth/mailer.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';

describe('cov src/modules/auth/routes.ts', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
  });

  // Lines 107-109: a mail-delivery failure on the email-change request must NOT turn
  // into a 500 — it's logged and the route still 202s (the token is already minted).
  it('still returns 202 when the email-change verification send fails', async () => {
    const { user, cookie } = await actingAs({ email: 'me@example.test' });
    const spy = vi
      .spyOn(mailer, 'sendEmailChangeVerification')
      // Synchronous throw inside the mock (not mockRejectedValue) so vitest's
      // unhandled-rejection detector doesn't fail the test; the async wrapper still
      // rejects and the route's try/catch swallows it.
      .mockImplementation(() => {
        throw new Error('SMTP 421 Try again later');
      });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/email-change/request',
      headers: { cookie },
      payload: { newEmail: 'fresh@example.test' },
    });

    expect(res.statusCode).toBe(202); // never a 500, even though the mailer threw
    expect(spy).toHaveBeenCalledTimes(1);
    // The token is still persisted (request succeeded before the send was attempted).
    expect(await prisma.emailChangeToken.count({ where: { userId: user.id } })).toBe(1);

    spy.mockRestore();
  });
});
