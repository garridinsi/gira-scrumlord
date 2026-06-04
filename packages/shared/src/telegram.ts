// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';

// A Telegram chat id is an integer (negative for groups/channels), well under 20 digits.
// Stored/transported as text since it can exceed 32-bit. The user gets it from their bot's
// `/start` reply and pastes it.
export const upsertTelegramLinkSchema = z.object({
  chatId: z
    .string()
    .trim()
    .regex(/^-?\d{1,19}$/, 'chat id must be a Telegram numeric id'),
});
export type UpsertTelegramLink = z.infer<typeof upsertTelegramLinkSchema>;

/** Per-user Telegram channel status for the account UI. */
export interface TelegramStatusView {
  enabled: boolean; // server has a TELEGRAM_BOT_TOKEN configured (channel available at all)
  linked: boolean; // this user has linked a chat
  chatId: string | null;
}

// ── Web Push (E1 channels) ────────────────────────────────────────────────────────────────
/** A browser PushSubscription as the client serializes it for POST /auth/me/push. */
export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
});
export type PushSubscribe = z.infer<typeof pushSubscribeSchema>;

/** Whether web push is available + this user's VAPID public key to subscribe with. */
export interface PushConfigView {
  enabled: boolean;
  publicKey: string | null;
}
