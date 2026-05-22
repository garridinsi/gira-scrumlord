// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';
import { rateScope } from './enums.js';

/**
 * Upsert a rate for one scope. Exactly the matching id must be present:
 * client→clientId, project→projectId, issue→issueId, default→none.
 */
export const upsertRateSchema = z
  .object({
    scope: rateScope,
    clientId: z.string().cuid().optional(),
    projectId: z.string().cuid().optional(),
    issueId: z.string().cuid().optional(),
    hourlyCents: z.number().int().min(0),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default('EUR'),
  })
  .refine(
    (v) =>
      (v.scope === 'default' && !v.clientId && !v.projectId && !v.issueId) ||
      (v.scope === 'client' && !!v.clientId && !v.projectId && !v.issueId) ||
      (v.scope === 'project' && !!v.projectId && !v.clientId && !v.issueId) ||
      (v.scope === 'issue' && !!v.issueId && !v.clientId && !v.projectId),
    { message: 'exactly the id matching `scope` must be set' },
  );
export type UpsertRate = z.infer<typeof upsertRateSchema>;
