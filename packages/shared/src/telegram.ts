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
