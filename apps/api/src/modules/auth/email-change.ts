// SPDX-License-Identifier: GPL-3.0-or-later
// Verified email-change flow. Email IS the magic-link login identity, so changing
// it must be done carefully: we mint a single-use token bound to {userId, newEmail}
// and send the link to the NEW address (proving the user controls it) — the email
// is never switched on the request itself. This makes the flow safe against account
// takeover and against colliding with an existing account.

import { type User, prisma } from '@gira/db';
import { generateToken, hashToken } from '@gira/domain';
import { recordAudit } from '@gira/sauron';
import { config } from '../../config.js';
import { badRequest, conflict, unauthorized } from '../../lib/http-error.js';

// A bit longer than the sign-in link: the user has to go read a different inbox.
const EMAIL_CHANGE_TTL_MINUTES = 30;

export interface EmailChangeRequestResult {
  newEmail: string;
  rawToken: string;
  link: string;
}

/**
 * Step 1 — request. Validates the target is free, mints a single-use token, and
 * returns the link to email to the NEW address. Throws (no token minted) if the
 * target is the same as the current email or already belongs to another account.
 */
export async function requestEmailChange(
  user: { id: string; email: string },
  newEmail: string,
): Promise<EmailChangeRequestResult> {
  if (newEmail === user.email) throw badRequest('that is already your email');

  const taken = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  if (taken) throw conflict('that email is already in use');

  // Single outstanding change request per user: drop any prior unconsumed tokens.
  await prisma.emailChangeToken.deleteMany({ where: { userId: user.id, consumedAt: null } });

  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TTL_MINUTES * 60_000);
  await prisma.emailChangeToken.create({
    data: { userId: user.id, newEmail, tokenHash: hash, expiresAt },
  });

  const link = `${config.APP_URL}/account/confirm-email?token=${raw}`;
  return { newEmail, rawToken: raw, link };
}

/**
 * Step 2 — confirm. Burns the token, then atomically switches User.email AND the
 * magic-link Identity to the verified address and revokes every session so the
 * user must re-authenticate with the new identity. Re-checks uniqueness inside the
 * transaction to close the request→confirm race.
 */
export async function confirmEmailChange(rawToken: string): Promise<User> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.emailChangeToken.findUnique({ where: { tokenHash } });
  if (!token || token.consumedAt || token.expiresAt < new Date()) {
    throw unauthorized('invalid or expired email-change link');
  }

  return prisma.$transaction(async (tx) => {
    // Atomic single-use: only the first caller flips consumedAt from null.
    const claimed = await tx.emailChangeToken.updateMany({
      where: { id: token.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (claimed.count === 0) throw unauthorized('email-change link already used');

    const before = await tx.user.findUnique({ where: { id: token.userId } });
    if (!before) throw unauthorized('account not available');

    // Re-check the target is still free (it may have been claimed since the request).
    const collision = await tx.user.findFirst({
      where: { email: token.newEmail, id: { not: token.userId } },
      select: { id: true },
    });
    if (collision) throw conflict('that email is already in use');

    const updated = await tx.user.update({
      where: { id: token.userId },
      data: { email: token.newEmail },
    });
    // Keep the magic-link identity (subject == email) in sync.
    await tx.identity.updateMany({
      where: { userId: token.userId, provider: 'magic-link' },
      data: { subject: token.newEmail, email: token.newEmail },
    });
    // Force re-authentication everywhere with the new identity.
    await tx.session.updateMany({
      where: { userId: token.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await recordAudit(tx, {
      actorId: token.userId,
      action: 'user.email.change',
      entityType: 'User',
      entityId: token.userId,
      before: { email: before.email },
      after: { email: updated.email },
    });
    return updated;
  });
}
