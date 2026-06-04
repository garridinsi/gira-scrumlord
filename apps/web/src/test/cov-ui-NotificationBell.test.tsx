// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for src/ui/NotificationBell.tsx. The sibling
// notification-bell.test.tsx covers the happy path (badge, list, mark-all),
// so these target the cold branches: label()'s emergency arm, the
// mention-without-actorName fallback, the non-string issueKey arms (both in
// label() and the row-key resolution), the unknown-type return arms, the 99+
// badge clamp, the Escape + outside-click close handlers, and the Link
// onClick that marks a single item read before closing.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { InboxItemView } from '@gira/shared';
import { renderWithProviders } from './render';

const h = vi.hoisted(() => ({
  unreadCount: vi.fn(),
  list: vi.fn(),
  markAllRead: vi.fn(),
  markRead: vi.fn(),
}));
vi.mock('../api/client', () => ({
  inbox: {
    unreadCount: () => h.unreadCount(),
    list: () => h.list(),
    markAllRead: () => h.markAllRead(),
    markRead: (id: string) => h.markRead(id),
  },
}));

import { NotificationBell } from '../ui/NotificationBell';

function item(overrides: Partial<InboxItemView> = {}): InboxItemView {
  return {
    id: 'n1',
    type: 'issue.assigned',
    payload: { issueKey: 'GIRA-1' },
    createdAt: '2026-06-01T00:00:00Z',
    readAt: null,
    ...overrides,
  };
}

describe('NotificationBell coverage', () => {
  beforeEach(() => {
    h.unreadCount.mockReset().mockResolvedValue({ unread: 1 });
    h.list.mockReset().mockResolvedValue([]);
    h.markAllRead.mockReset().mockResolvedValue({ marked: 0 });
    h.markRead.mockReset().mockResolvedValue({});
  });

  it('labels an emergency notification (line 15)', async () => {
    h.list.mockResolvedValue([
      item({ id: 'e1', type: 'issue.emergency', payload: { issueKey: 'GIRA-9' } }),
    ]);
    renderWithProviders(<NotificationBell />);
    await userEvent.click(screen.getByRole('button', { name: /Notificaciones/ }));
    expect(await screen.findByText(/GIRA-9 · emergencia · emergency/)).toBeInTheDocument();
  });

  it('falls back to "Alguien" when a mention has no actorName (lines 16, 17 fallback, 18)', async () => {
    h.list.mockResolvedValue([
      // actorName absent => the `: 'Alguien'` fallback arm of the ternary.
      item({ id: 'm1', type: 'mention', payload: { issueKey: 'GIRA-7' } }),
    ]);
    renderWithProviders(<NotificationBell />);
    await userEvent.click(screen.getByRole('button', { name: /Notificaciones/ }));
    expect(
      await screen.findByText(/GIRA-7 · Alguien te mencionó · mentioned you/),
    ).toBeInTheDocument();
  });

  it('labels an unknown type with its key prefix (line 20 truthy arm)', async () => {
    h.list.mockResolvedValue([
      item({ id: 'u1', type: 'sprint.started', payload: { issueKey: 'GIRA-5' } }),
    ]);
    renderWithProviders(<NotificationBell />);
    await userEvent.click(screen.getByRole('button', { name: /Notificaciones/ }));
    expect(await screen.findByText(/GIRA-5 · sprint\.started/)).toBeInTheDocument();
  });

  it('labels an unknown type without a key (lines 12, 20 falsy arm, 147, 174-176)', async () => {
    // issueKey is not a string => key === '' in label() (line 12) and key === null
    // in the row resolver (line 147) => the plain non-link div row (174-176), and
    // the bare-type return (line 20 falsy arm).
    h.list.mockResolvedValue([
      item({
        id: 'x1',
        type: 'system.notice',
        payload: { issueKey: 42 },
        readAt: '2026-06-02T00:00:00Z',
      }),
    ]);
    renderWithProviders(<NotificationBell />);
    await userEvent.click(screen.getByRole('button', { name: /Notificaciones/ }));
    const row = await screen.findByText('system.notice');
    expect(row).toBeInTheDocument();
    // No issueKey link wraps it.
    expect(row.closest('a')).toBeNull();
    // It is still a menuitem div.
    expect(screen.getByRole('menuitem')).toBeInTheDocument();
  });

  it('clamps the unread badge to 99+ (line 96)', async () => {
    h.unreadCount.mockResolvedValue({ unread: 150 });
    renderWithProviders(<NotificationBell />);
    expect(await screen.findByText('99+')).toBeInTheDocument();
  });

  it('marks a single unread item read on click, then closes (lines 167, 168, 169, 172)', async () => {
    h.list.mockResolvedValue([
      item({ id: 'n1', type: 'issue.assigned', payload: { issueKey: 'GIRA-1' }, readAt: null }),
    ]);
    renderWithProviders(<NotificationBell />);
    await userEvent.click(screen.getByRole('button', { name: /Notificaciones/ }));
    const link = await screen.findByRole('menuitem');
    expect(link.tagName).toBe('A');
    await userEvent.click(link);
    await waitFor(() => expect(h.markRead).toHaveBeenCalledWith('n1'));
    // setOpen(false) ran => the menu is gone.
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('does not mark an already-read item read on click (line 167 false arm)', async () => {
    h.list.mockResolvedValue([
      item({
        id: 'n2',
        type: 'issue.assigned',
        payload: { issueKey: 'GIRA-2' },
        readAt: '2026-06-02T00:00:00Z',
      }),
    ]);
    renderWithProviders(<NotificationBell />);
    await userEvent.click(screen.getByRole('button', { name: /Notificaciones/ }));
    const link = await screen.findByRole('menuitem');
    await userEvent.click(link);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(h.markRead).not.toHaveBeenCalled();
  });

  it('closes the dropdown on Escape (lines 53, 54)', async () => {
    renderWithProviders(<NotificationBell />);
    await userEvent.click(screen.getByRole('button', { name: /Notificaciones/ }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('closes the dropdown on an outside mousedown (lines 55, 56)', async () => {
    renderWithProviders(
      <div>
        <NotificationBell />
        <button type="button">outside</button>
      </div>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Notificaciones/ }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    // A pointerdown/mousedown on an element outside the bell's ref closes it.
    await userEvent.click(screen.getByRole('button', { name: 'outside' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});
