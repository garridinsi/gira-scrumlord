// SPDX-License-Identifier: GPL-3.0-or-later
// AccountPage Telegram section: hidden when the channel is disabled; offers linking when
// enabled+unlinked; shows the linked chat + unlinks. (Separate file so the main AccountPage
// cov test can keep the channel disabled and untouched.)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

const h = vi.hoisted(() => ({
  telegram: vi.fn(),
  linkTelegram: vi.fn(),
  unlinkTelegram: vi.fn(),
}));
vi.mock('../api/client', () => ({
  auth: {
    updateMe: () => Promise.resolve({ id: 'u1', name: 'Ada', locale: 'es' }),
    sessions: () => Promise.resolve([]),
    revokeOtherSessions: () => Promise.resolve({ revoked: 0 }),
    requestEmailChange: () => Promise.resolve({ status: 'ok' }),
    telegram: () => h.telegram(),
    linkTelegram: (c: string) => h.linkTelegram(c),
    unlinkTelegram: () => h.unlinkTelegram(),
    pushConfig: () => Promise.resolve({ enabled: false, publicKey: null }),
    subscribePush: () => Promise.resolve(),
    unsubscribePush: () => Promise.resolve(),
  },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useAuth', () => ({
  useMe: () => ({
    data: {
      id: 'u1',
      name: 'Ada',
      email: 'ada@example.test',
      locale: 'es',
      kind: 'staff',
      role: 'member',
    },
    isLoading: false,
  }),
}));

import { AccountPage } from '../pages/AccountPage';

describe('AccountPage — Telegram section', () => {
  beforeEach(() => {
    h.telegram.mockReset();
    h.linkTelegram.mockReset().mockResolvedValue(undefined);
    h.unlinkTelegram.mockReset().mockResolvedValue(undefined);
  });

  it('hides the section entirely when the channel is disabled', async () => {
    h.telegram.mockResolvedValue({ enabled: false, linked: false, chatId: null });
    renderWithProviders(<AccountPage />);
    await screen.findByText('ada@example.test'); // page has loaded
    expect(screen.queryByText('// Telegram')).not.toBeInTheDocument();
  });

  it('offers linking when enabled + unlinked, and links the pasted chat id', async () => {
    h.telegram.mockResolvedValue({ enabled: true, linked: false, chatId: null });
    renderWithProviders(<AccountPage />);
    expect(await screen.findByText('// Telegram')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Telegram chat id'), '12345');
    await userEvent.click(screen.getByRole('button', { name: /Vincular · Link/ }));
    await waitFor(() => expect(h.linkTelegram).toHaveBeenCalledWith('12345'));
  });

  it('shows the linked chat id and unlinks it', async () => {
    h.telegram.mockResolvedValue({ enabled: true, linked: true, chatId: '999777' });
    renderWithProviders(<AccountPage />);
    expect(await screen.findByText('// Telegram')).toBeInTheDocument();
    expect(screen.getByText('999777')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Desvincular · Unlink/ }));
    await waitFor(() => expect(h.unlinkTelegram).toHaveBeenCalled());
  });
});
