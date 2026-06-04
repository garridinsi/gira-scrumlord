// SPDX-License-Identifier: GPL-3.0-or-later
// Magic-link lifecycle: mint a single-use token for a known user (or bootstrap
// the very first admin), then consume it exactly once.

import { prisma, type User } from '@gira/db';
import { generateToken, hashToken } from '@gira/domain';
import { config } from '../../config.js';
import { unauthorized } from '../../lib/http-error.js';

export interface MagicLinkResult {
  /** Whether a link was actually minted. The route returns 202 either way. */
  sent: boolean;
  rawToken?: string;
  link?: string;
}

export async function createMagicLink(email: string): Promise<MagicLinkResult> {
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const count = await prisma.user.count();
    if (count === 0) {
      // Bootstrap: the first person to sign in to a fresh install becomes admin.
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0] || 'admin',
          kind: 'staff',
          role: 'admin',
          identities: { create: { provider: 'magic-link', subject: email, email } },
        },
      });
    } else {
      // Known-users-only. No open signup, and no enumeration (route still 202s).
      return { sent: false };
    }
  }

  // Per-account throttle: suppress minting (and therefore emailing) another link if
  // one was issued for this address within the cooldown window — an IP-rotating
  // attacker can't email-bomb a known victim. We've already confirmed the account
  // exists here, and the route 202s regardless, so this leaks nothing.
  const cooldownMs = config.MAGIC_LINK_COOLDOWN_SECONDS * 1000;
  if (cooldownMs > 0) {
    const recent = await prisma.magicLinkToken.findFirst({
      where: { email, createdAt: { gt: new Date(Date.now() - cooldownMs) } },
      select: { id: true },
    });
    if (recent) return { sent: false };
  }

  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + config.MAGIC_LINK_TTL_MINUTES * 60_000);
  await prisma.magicLinkToken.create({ data: { email, tokenHash: hash, expiresAt } });

  const link = `${config.APP_URL}/auth/callback?token=${raw}`;
  return { sent: true, rawToken: raw, link };
}

export async function consumeMagicLink(rawToken: string): Promise<User> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });
  if (!token || token.consumedAt || token.expiresAt < new Date()) {
    throw unauthorized('invalid or expired sign-in link');
  }

  // Atomic single-use: only the first caller flips consumedAt from null.
  const claimed = await prisma.magicLinkToken.updateMany({
    where: { id: token.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  /* c8 ignore next -- TOCTOU race arm: reachable only when a concurrent caller consumes the
     token between this caller's findUnique (line 62, saw consumedAt null) and this updateMany.
     The atomic updateMany IS the guard; this branch can't be hit deterministically in a
     single-process test without spying Prisma's proxy methods (which corrupts the suite). */
  if (claimed.count === 0) throw unauthorized('sign-in link already used');

  const user = await prisma.user.findUnique({ where: { email: token.email } });
  if (!user || !user.isActive) throw unauthorized('account not available');
  return user;
}
