// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';
import { userKind, userLocale, userRole } from './enums.js';

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
  })
  // Security invariant: client users are always read-only viewers. They get the
  // portal, never write access to the staff surface. Normalize rather than reject
  // so a UI that defaults role to 'member' can't accidentally create a client writer.
  .transform((v) => (v.kind === 'client' ? { ...v, role: 'viewer' as const } : v));
export type CreateUser = z.infer<typeof createUserSchema>;

/** Edit an existing user. Email is immutable (it's the login identity). */
export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: userRole.optional(),
  isActive: z.boolean().optional(),
  clientId: z.string().min(1).nullable().optional(),
});
export type UpdateUser = z.infer<typeof updateUserSchema>;

/**
 * Self-service profile edit (PATCH /auth/me). Deliberately accepts ONLY the fields
 * a user may change about themselves — name and UI language. It must NEVER carry
 * role, kind, clientId, isActive, or email: those are privilege/identity fields and
 * are handled by the admin route (role/kind/active) or the verified email-change
 * flow (email). `.strict()` rejects any unknown key so a crafted payload can't smuggle
 * one through, and at least one field must be present.
 */
export const selfProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    locale: userLocale.optional(),
  })
  .strict()
  .refine((v) => v.name !== undefined || v.locale !== undefined, {
    message: 'nothing to update',
  });
export type SelfProfile = z.infer<typeof selfProfileSchema>;

/** Request a verified email change — the link is sent to this NEW address. */
export const emailChangeRequestSchema = z.object({
  newEmail: z.string().trim().email().max(200),
});
export type EmailChangeRequest = z.infer<typeof emailChangeRequestSchema>;

/** Confirm an email change by presenting the single-use token from that email. */
export const emailChangeConfirmSchema = z.object({
  token: z.string().min(1),
});
export type EmailChangeConfirm = z.infer<typeof emailChangeConfirmSchema>;
