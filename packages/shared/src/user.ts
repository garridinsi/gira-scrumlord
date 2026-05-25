// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';
import { userKind, userRole } from './enums.js';

/**
 * Admin creates a person who can then sign in via magic link. A client user must
 * belong to a client (that's what scopes them to the portal); a staff user must not.
 */
export const createUserSchema = z
  .object({
    email: z.string().trim().email().max(200),
    name: z.string().trim().min(1).max(120),
    kind: userKind.default('staff'),
    role: userRole.default('member'),
    clientId: z.string().min(1).optional(),
  })
  .refine((v) => v.kind !== 'client' || !!v.clientId, {
    message: 'a client user must belong to a client',
    path: ['clientId'],
  })
  .refine((v) => v.kind !== 'staff' || !v.clientId, {
    message: 'staff users are not scoped to a client',
    path: ['clientId'],
  });
export type CreateUser = z.infer<typeof createUserSchema>;

/** Edit an existing user. Email is immutable (it's the login identity). */
export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: userRole.optional(),
  isActive: z.boolean().optional(),
  clientId: z.string().min(1).nullable().optional(),
});
export type UpdateUser = z.infer<typeof updateUserSchema>;
