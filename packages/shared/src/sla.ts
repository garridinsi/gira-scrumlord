// SPDX-License-Identifier: GPL-3.0-or-later
// B2: per-project SLA policy config.
import { z } from 'zod';
import { priority } from './enums.js';

export const upsertSlaPolicySchema = z.object({
  // null/omitted = the project-wide default; a Priority value = a policy for that priority.
  priority: priority.nullish(),
  responseMinutes: z
    .number()
    .int()
    .min(1)
    .max(60 * 24 * 365),
  resolutionMinutes: z
    .number()
    .int()
    .min(1)
    .max(60 * 24 * 365),
});
export type UpsertSlaPolicy = z.infer<typeof upsertSlaPolicySchema>;

export interface SlaPolicyView {
  id: string;
  projectId: string;
  priority: string | null;
  responseMinutes: number;
  resolutionMinutes: number;
}

// Project-level SLA attainment: of the issues for which a milestone applies, the share met
// within target.
export interface SlaAttainmentMetric {
  applicable: number;
  met: number;
  pct: number | null; // null when applicable = 0
}
export interface SlaAttainmentView {
  projectKey: string;
  response: SlaAttainmentMetric;
  resolution: SlaAttainmentMetric;
}
