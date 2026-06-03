// SPDX-License-Identifier: GPL-3.0-or-later
// E1: a user's in-app notification inbox item (their personal notifications).
export interface InboxItemView {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}
export interface InboxUnreadView {
  unread: number;
}
