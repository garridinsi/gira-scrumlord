// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('NotificationBell', () => {
  beforeEach(() => {
    h.unreadCount.mockReset().mockResolvedValue({ unread: 3 });
    h.list.mockReset().mockResolvedValue([
      {
        id: 'n1',
        type: 'issue.assigned',
        payload: { issueKey: 'GIRA-1' },
        createdAt: '2026-06-01T00:00:00Z',
        readAt: null,
      },
      {
        id: 'n2',
        type: 'issue.status_changed',
        payload: { issueKey: 'GIRA-2' },
        createdAt: '2026-06-02T00:00:00Z',
        readAt: '2026-06-02T01:00:00Z',
      },
      {
        id: 'n3',
        type: 'mention',
        payload: { issueKey: 'GIRA-3', actorName: 'Bea' },
        createdAt: '2026-06-03T00:00:00Z',
        readAt: null,
      },
    ]);
    h.markAllRead.mockReset().mockResolvedValue({ marked: 3 });
    h.markRead.mockReset().mockResolvedValue({});
  });

  it('shows the unread badge from the count endpoint', async () => {
    renderWithProviders(<NotificationBell />);
    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3 sin leer · unread/ })).toBeInTheDocument();
  });

  it('opens the dropdown, lists notifications, and marks all read', async () => {
    renderWithProviders(<NotificationBell />);
    await screen.findByText('3');
    await userEvent.click(screen.getByRole('button', { name: /Notificaciones/ }));

    expect(await screen.findByText(/GIRA-1 · asignada a ti/)).toBeInTheDocument();
    expect(screen.getByText(/GIRA-2 · estado cambiado/)).toBeInTheDocument();
    expect(screen.getByText(/GIRA-3 · Bea te mencionó · mentioned you/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /marcar leído · mark read/ }));
    await waitFor(() => expect(h.markAllRead).toHaveBeenCalledTimes(1));
  });

  it('renders the empty state when there are no notifications', async () => {
    h.unreadCount.mockResolvedValue({ unread: 0 });
    h.list.mockResolvedValue([]);
    renderWithProviders(<NotificationBell />);
    await userEvent.click(screen.getByRole('button', { name: /Notificaciones/ }));
    expect(await screen.findByText(/Sin notificaciones · no notifications/)).toBeInTheDocument();
  });
});
