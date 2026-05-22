// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';
import { statusCategory } from './enums.js';

export const projectKey = z
  .string()
  .trim()
  .regex(/^[A-Z][A-Z0-9]{1,9}$/, 'key must be 2-10 uppercase letters/digits, e.g. GIRA');

export const createProjectSchema = z.object({
  key: projectKey,
  name: z.string().trim().min(1).max(120),
  description: z.string().max(5000).optional(),
  clientId: z.string().cuid().nullish(),
});
export type CreateProject = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(5000).optional(),
  clientId: z.string().cuid().nullish(),
});
export type UpdateProject = z.infer<typeof updateProjectSchema>;

export const createStatusSchema = z.object({
  name: z.string().trim().min(1).max(40),
  category: statusCategory,
  order: z.number().int().min(0).optional(),
});
export type CreateStatus = z.infer<typeof createStatusSchema>;

export const updateStatusSchema = createStatusSchema.partial();
export type UpdateStatus = z.infer<typeof updateStatusSchema>;

export const createLabelSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'color must be a hex like #8b5cf6')
    .default('#8b5cf6'),
});
export type CreateLabel = z.infer<typeof createLabelSchema>;
