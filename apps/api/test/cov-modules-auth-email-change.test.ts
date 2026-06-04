// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-focused cases for src/modules/auth/email-change.ts.
// Targets the atomic single-use race arm in confirmEmailChange (line 81):
// `if (claimed.count === 0) throw unauthorized('email-change link already used')`.
// That arm is only reachable when two confirms read the still-unconsumed token
// before either commits, then serialize on the row lock at updateMany — the loser
// claims 0 rows. We drive it by firing concurrent confirmEmailChange calls against
// the same raw token; exactly one wins, the rest are rejected as already-used.

import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { HttpError } from '../src/lib/http-error.js';
import { confirmEmailChange, requestEmailChange } from '../src/modules/auth/email-change.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';

describe('cov src/modules/auth/email-change.ts', () => {
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

  it('confirm: concurrent confirms of one token — exactly one wins, the rest are rejected as already-used', async () => {
    const { user } = await actingAs({ email: 'race@example.test' });
    const { rawToken } = await requestEmailChange(
      { id: user.id, email: 'race@example.test' },
      'won@example.test',
    );

    // Fire several confirms at once. They share one unconsumed token: under the
    // row lock at updateMany only one flips consumedAt (count===1); the others get
    // count===0 and hit the `already used` arm. allSettled awaits every rejection,
    // so no promise is left unhandled.
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => confirmEmailChange(rawToken)),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(5);

    // The single winner switched the email.
    const winner = fulfilled[0]!;
    expect((winner as PromiseFulfilledResult<{ email: string }>).value.email).toBe(
      'won@example.test',
    );

    // Every loser is a 401 HttpError (either the pre-check or the race arm — both
    // surface as `unauthorized`).
    for (const r of rejected) {
      expect(r.reason).toBeInstanceOf(HttpError);
      expect((r.reason as HttpError).statusCode).toBe(401);
    }

    // The user really has the new email exactly once; the token is consumed.
    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row?.email).toBe('won@example.test');
    const tok = await prisma.emailChangeToken.findFirst({ where: { userId: user.id } });
    expect(tok?.consumedAt).not.toBeNull();
  });
});
