// SPDX-License-Identifier: GPL-3.0-or-later
// R1: client contract / SOW — anchors retainer billing and SLA coverage.
import { z } from 'zod';

const cuid = z.string().cuid();

export const contractStatus = z.enum(['active', 'ended']);
export type ContractStatus = z.infer<typeof contractStatus>;

export const createContractSchema = z.object({
  clientId: cuid,
  name: z.string().trim().min(1).max(200),
  retainerCents: z.number().int().min(0).nullish(),
  includedHours: z.number().int().min(0).max(10_000).nullish(),
  startDate: z.coerce.date().nullish(),
  endDate: z.coerce.date().nullish(),
  status: contractStatus.default('active'),
  notes: z.string().trim().max(20_000).nullish(),
});
export type CreateContract = z.infer<typeof createContractSchema>;

export const updateContractSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  retainerCents: z.number().int().min(0).nullish(),
  includedHours: z.number().int().min(0).max(10_000).nullish(),
  startDate: z.coerce.date().nullish(),
  endDate: z.coerce.date().nullish(),
  status: contractStatus.optional(),
  notes: z.string().trim().max(20_000).nullish(),
});
export type UpdateContract = z.infer<typeof updateContractSchema>;

export interface ContractView {
  id: string;
  clientId: string;
  name: string;
  retainerCents: number | null;
  includedHours: number | null;
  startDate: string | null;
  endDate: string | null;
  status: 'active' | 'ended';
  notes: string | null;
  createdAt: string;
}
