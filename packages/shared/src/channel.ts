// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';
import { channelKind, channelScope } from './enums.js';

/** Known event types a channel can subscribe to (free strings allowed for forward-compat). */
export const KNOWN_EVENTS = ['issue.emergency', 'issue.assigned'] as const;

export const createChannelSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    kind: channelKind,
    target: z.string().trim().min(1).max(500),
    scope: channelScope.default('global'),
    projectId: z.string().cuid().optional(),
    events: z.array(z.string().min(1)).min(1).default(['issue.emergency']),
  })
  .refine((v) => v.kind !== 'email' || z.string().email().safeParse(v.target).success, {
    message: 'an email channel target must be an email address',
    path: ['target'],
  })
  .refine((v) => v.kind !== 'webhook' || /^https?:\/\//i.test(v.target), {
    message: 'a webhook channel target must be an http(s) URL',
    path: ['target'],
  })
  .refine((v) => v.scope !== 'project' || !!v.projectId, {
    message: 'projectId is required when scope is project',
    path: ['projectId'],
  });
export type CreateChannel = z.infer<typeof createChannelSchema>;

export const updateChannelSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  target: z.string().trim().min(1).max(500).optional(),
  events: z.array(z.string().min(1)).min(1).optional(),
  active: z.boolean().optional(),
});
export type UpdateChannel = z.infer<typeof updateChannelSchema>;
