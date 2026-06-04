// SPDX-License-Identifier: GPL-3.0-or-later
// AccountPage Web Push section: hidden when disabled server-side; shows a not-supported note
// when the browser can't; enables push (subscribe browser → POST subscription) when it can.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

const h = vi.hoisted(() => ({
  pushConfig: vi.fn(),
  subscribePush: vi.fn(),
  unsubscribePush: vi.fn(),
  pushSupported: vi.fn(),
  subscribeBrowser: vi.fn(),
  unsubscribeBrowser: vi.fn(),
}));
vi.mock('../api/client', () => ({
  auth: {
    updateMe: () => Promise.resolve({ id: 'u1', name: 'Ada', locale: 'es' }),
    sessions: () => Promise.resolve([]),
    revokeOtherSessions: () => Promise.resolve({ revoked: 0 }),
    requestEmailChange: () => Promise.resolve({ status: 'ok' }),
    telegram: () => Promise.resolve({ enabled: false, linked: false, chatId: null }),
    linkTelegram: () => Promise.resolve(),
    unlinkTelegram: () => Promise.resolve(),
    pushConfig: () => h.pushConfig(),
    subscribePush: (s: unknown) => h.subscribePush(s),
    unsubscribePush: (e?: string) => h.unsubscribePush(e),
  },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../lib/push', () => ({
  pushSupported: () => h.pushSupported(),
  subscribeBrowser: (k: string) => h.subscribeBrowser(k),
  unsubscribeBrowser: () => h.unsubscribeBrowser(),
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

const TITLE = '// Notificaciones push · Web Push';

describe('AccountPage — Web Push section', () => {
  beforeEach(() => {
    h.pushConfig.mockReset();
    h.subscribePush.mockReset().mockResolvedValue(undefined);
    h.unsubscribePush.mockReset().mockResolvedValue(undefined);
    h.pushSupported.mockReset().mockReturnValue(true);
    h.subscribeBrowser
      .mockReset()
      .mockResolvedValue({ endpoint: 'https://p/x', keys: { p256dh: 'pk', auth: 'ak' } });
    h.unsubscribeBrowser.mockReset().mockResolvedValue('https://p/x');
  });

  it('hides the section when web push is disabled server-side', async () => {
    h.pushConfig.mockResolvedValue({ enabled: false, publicKey: null });
    renderWithProviders(<AccountPage />);
    await screen.findByText('ada@example.test');
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });

  it('shows a not-supported note when the browser lacks push', async () => {
    h.pushConfig.mockResolvedValue({ enabled: true, publicKey: 'PUBKEY' });
    h.pushSupported.mockReturnValue(false);
    renderWithProviders(<AccountPage />);
    expect(await screen.findByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText(/not supported in this browser/)).toBeInTheDocument();
  });

  it('enables push: subscribes the browser and posts the subscription', async () => {
    h.pushConfig.mockResolvedValue({ enabled: true, publicKey: 'PUBKEY' });
    renderWithProviders(<AccountPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Activar · Enable/ }));
    await waitFor(() => expect(h.subscribeBrowser).toHaveBeenCalledWith('PUBKEY'));
    await waitFor(() =>
      expect(h.subscribePush).toHaveBeenCalledWith({
        endpoint: 'https://p/x',
        keys: { p256dh: 'pk', auth: 'ak' },
      }),
    );
    expect(await screen.findByText(/✓ activado · enabled/)).toBeInTheDocument();
  });
});
