// SPDX-License-Identifier: GPL-3.0-or-later
// Q1: internal runbook / KB article (staff-only).
import { z } from 'zod';

const cuid = z.string().cuid();

export const createKbArticleSchema = z.object({
  clientId: cuid.nullish(), // null/omitted = org-wide
  title: z.string().trim().min(1).max(300),
  body: z.string().max(100_000).default(''),
});
export type CreateKbArticle = z.infer<typeof createKbArticleSchema>;

export const updateKbArticleSchema = z
  .object({
    clientId: cuid.nullish(),
    title: z.string().trim().min(1).max(300).optional(),
    body: z.string().max(100_000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'nothing to update' });
export type UpdateKbArticle = z.infer<typeof updateKbArticleSchema>;

export interface KbArticleView {
  id: string;
  clientId: string | null;
  title: string;
  body: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}
