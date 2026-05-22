// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';

export const magicLinkRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;

export const magicLinkCallbackSchema = z.object({
  token: z.string().min(10),
});
export type MagicLinkCallback = z.infer<typeof magicLinkCallbackSchema>;
