// SPDX-License-Identifier: GPL-3.0-or-later
// Authorization scoping. The rule that protects client confidentiality:
// a client user can only ever touch projects belonging to their own client.
// Staff (admin/member/viewer) see everything; viewers are read-only.

import type { Prisma } from '@gira/db';
import type { AuthUser } from './auth.js';
import { forbidden } from './http-error.js';

export function canWrite(u: AuthUser): boolean {
  return u.role === 'admin' || u.role === 'member';
}

export function assertCanWrite(u: AuthUser): void {
  if (!canWrite(u)) throw forbidden('your role is read-only');
}

export function assertAdmin(u: AuthUser): void {
  if (u.role !== 'admin') throw forbidden('admin only');
}

/** WHERE clause limiting a project list to what the user may see. */
export function projectScopeWhere(u: AuthUser): Prisma.ProjectWhereInput {
  if (u.kind === 'client') return { clientId: u.clientId };
  return {};
}

/** Throw 403 if a client user reaches for a project that isn't theirs. */
export function assertCanAccessProject(u: AuthUser, project: { clientId: string | null }): void {
  if (u.kind === 'client' && project.clientId !== u.clientId) {
    throw forbidden('not your project');
  }
}
