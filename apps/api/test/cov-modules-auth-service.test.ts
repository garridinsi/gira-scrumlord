// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage closure for src/modules/auth/service.ts.
// Targets:
//   line 27 — the `|| 'admin'` name fallback when the bootstrap email has no local part
//   line 75 — the "account not available" arm when the token's user is missing/inactive
// (line 72, the concurrent-consume race arm, is c8-ignored in the source: it can't be hit
//  deterministically without spying Prisma proxies, which corrupts the single-fork suite.)
import { afterEach, describe, expect, it } from 'vitest';
import { consumeMagicLink, createMagicLink } from '../src/modules/auth/service.js';
import { prisma, resetDb } from './helpers/db.js';
import { makeUser } from './helpers/auth.js';

describe('cov src/modules/auth/service.ts', () => {
  afterEach(async () => {
    await resetDb();
  });

  it('falls back to "admin" as the name when the bootstrap email has no local part (line 27)', async () => {
    // Fresh DB ⇒ count === 0 ⇒ bootstrap branch. An email whose local part is empty
    // makes `email.split('@')[0]` === '' (falsy), so the `|| 'admin'` fallback fires.
    await resetDb();
    expect(await prisma.user.count()).toBe(0);

    const result = await createMagicLink('@example.test');
    expect(result.sent).toBe(true);

    const user = await prisma.user.findUnique({ where: { email: '@example.test' } });
    expect(user?.role).toBe('admin');
    expect(user?.name).toBe('admin');
  });

  it('rejects an already-consumed token with "invalid or expired" (line 63 guard)', async () => {
    await resetDb();
    await makeUser({ email: 'racer@example.test' });
    const { rawToken } = await createMagicLink('racer@example.test');
    expect(rawToken).toBeDefined();

    // Consume it once for real, then a second consume hits the consumedAt guard on line 63.
    await consumeMagicLink(rawToken!);
    await expect(consumeMagicLink(rawToken!)).rejects.toMatchObject({
      statusCode: 401,
      message: 'invalid or expired sign-in link',
    });
  });

  it('throws "account not available" when the token user is gone (line 75)', async () => {
    await resetDb();
    await makeUser({ email: 'ghost@example.test' });
    const { rawToken } = await createMagicLink('ghost@example.test');
    expect(rawToken).toBeDefined();

    // Remove the user after the token was minted: the token is valid and unconsumed, the
    // claim succeeds, but the user lookup on line 74 returns null → line 75 throws.
    await prisma.user.deleteMany({ where: { email: 'ghost@example.test' } });

    await expect(consumeMagicLink(rawToken!)).rejects.toMatchObject({
      statusCode: 401,
      message: 'account not available',
    });
  });

  it('throws "account not available" when the token user is inactive (line 75, isActive arm)', async () => {
    await resetDb();
    await makeUser({ email: 'frozen@example.test' });
    const { rawToken } = await createMagicLink('frozen@example.test');
    expect(rawToken).toBeDefined();

    await prisma.user.update({
      where: { email: 'frozen@example.test' },
      data: { isActive: false },
    });

    await expect(consumeMagicLink(rawToken!)).rejects.toMatchObject({
      statusCode: 401,
      message: 'account not available',
    });
  });
});
