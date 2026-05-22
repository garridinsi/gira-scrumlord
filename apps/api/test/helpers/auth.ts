// SPDX-License-Identifier: GPL-3.0-or-later
// Test helpers for acting as a user. Other slice tests use `actingAs(...)` and
// pass the returned cookie header into app.inject({ headers: { cookie } }).

import { type UserKind, type UserRole, prisma } from '@gira/db';
import { SESSION_COOKIE, createSession } from '../../src/modules/auth/session.js';

let counter = 0;

export async function makeUser(
  opts: {
    email?: string;
    name?: string;
    kind?: UserKind;
    role?: UserRole;
    clientId?: string | null;
  } = {},
) {
  const email = opts.email ?? `user${counter++}@example.test`;
  return prisma.user.create({
    data: {
      email,
      name: opts.name ?? 'Test User',
      kind: opts.kind ?? 'staff',
      role: opts.role ?? 'member',
      clientId: opts.clientId ?? null,
      identities: { create: { provider: 'magic-link', subject: email, email } },
    },
  });
}

export async function cookieFor(userId: string): Promise<string> {
  const { cookieValue } = await createSession(userId);
  return `${SESSION_COOKIE}=${cookieValue}`;
}

export async function actingAs(opts: Parameters<typeof makeUser>[0] = {}) {
  const user = await makeUser(opts);
  const cookie = await cookieFor(user.id);
  return { user, cookie };
}
