// SPDX-License-Identifier: GPL-3.0-or-later
// Promote (or create) a user as a staff admin — the deterministic superadmin
// bootstrap for a fresh production deploy (instead of relying on first-login).
//
//   docker compose ... run --rm api \
//     pnpm --filter @gira/db exec tsx prisma/make-admin.ts info@example.com
//
// Idempotent: re-running just ensures the account is an active staff admin.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('usage: tsx prisma/make-admin.ts <email>');
    process.exit(1);
  }
  const name = email.split('@')[0] ?? 'admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { kind: 'staff', role: 'admin', isActive: true },
    });
    console.log(`✓ ${email} is now an active staff admin (updated).`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      kind: 'staff',
      role: 'admin',
      // The magic-link identity so they can sign in by email immediately.
      identities: { create: { provider: 'magic-link', subject: email, email } },
    },
  });
  console.log(`✓ created staff admin ${email}.`);
}

main()
  .catch((err) => {
    console.error('make-admin failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
