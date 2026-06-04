// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

const { updateMe, sessions, revokeOtherSessions, requestEmailChange, user } = vi.hoisted(() => ({
  updateMe: vi.fn(),
  sessions: vi.fn(),
  revokeOtherSessions: vi.fn(),
  requestEmailChange: vi.fn(),
  // A STABLE reference — the page seeds its form in a useEffect keyed on me.data,
  // so a fresh object each render would re-seed and clobber typed input.
  user: {
    id: 'u1',
    name: 'Ada',
    email: 'ada@example.test',
    role: 'admin',
    kind: 'staff',
    locale: 'es',
  },
}));
vi.mock('../api/client', () => ({
  auth: {
    updateMe: (d: unknown) => updateMe(d),
    sessions: () => sessions(),
    revokeOtherSessions: () => revokeOtherSessions(),
    requestEmailChange: (e: string) => requestEmailChange(e),
    telegram: () => Promise.resolve({ enabled: false, linked: false, chatId: null }),
    linkTelegram: () => Promise.resolve(),
    unlinkTelegram: () => Promise.resolve(),
  },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: user, isLoading: false }) }));

import { AccountPage } from '../pages/AccountPage';

describe('AccountPage', () => {
  beforeEach(() => {
    updateMe.mockReset();
    sessions.mockReset().mockResolvedValue([]);
    revokeOtherSessions.mockReset();
    requestEmailChange.mockReset();
  });

  it('renders the profile (seeded) and read-only identity', async () => {
    renderWithProviders(<AccountPage />);
    expect(await screen.findByText('MI CUENTA')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ada')).toBeInTheDocument(); // name input seeded from me
    expect(screen.getByText('ada@example.test')).toBeInTheDocument(); // identity row
    expect(screen.getByText(/Admin/)).toBeInTheDocument();
  });

  it('saves the profile when the name changes', async () => {
    updateMe.mockResolvedValue({
      id: 'u1',
      name: 'Ada Lovelace',
      email: 'ada@example.test',
      role: 'admin',
      kind: 'staff',
      locale: 'es',
    });
    renderWithProviders(<AccountPage />);
    const nameInput = await screen.findByDisplayValue('Ada');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Ada Lovelace');
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(updateMe).toHaveBeenCalledTimes(1));
    expect(updateMe.mock.calls[0]![0]).toMatchObject({ name: 'Ada Lovelace', locale: 'es' });
  });

  it('requests a verified email change for the typed address', async () => {
    requestEmailChange.mockResolvedValue({});
    renderWithProviders(<AccountPage />);
    await userEvent.type(await screen.findByLabelText(/New email/i), 'new@example.test');
    await userEvent.click(screen.getByRole('button', { name: /Send link/ }));
    await waitFor(() => expect(requestEmailChange).toHaveBeenCalledWith('new@example.test'));
  });

  it('lists active sessions and revokes the others', async () => {
    sessions.mockResolvedValue([
      {
        id: 's1',
        current: true,
        userAgent: 'Chrome',
        ip: '1.2.3.4',
        createdAt: '2026-01-01T00:00:00Z',
        lastSeenAt: '2026-06-01T00:00:00Z',
      },
      {
        id: 's2',
        current: false,
        userAgent: 'Safari',
        ip: '5.6.7.8',
        createdAt: '2026-01-01T00:00:00Z',
        lastSeenAt: '2026-05-01T00:00:00Z',
      },
    ]);
    revokeOtherSessions.mockResolvedValue({ revoked: 1 });
    renderWithProviders(<AccountPage />);
    expect(await screen.findByText('Chrome')).toBeInTheDocument();
    expect(screen.getByText('Safari')).toBeInTheDocument();
    expect(screen.getByText(/actual · current/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /everywhere else/i }));
    await waitFor(() => expect(revokeOtherSessions).toHaveBeenCalledTimes(1));
  });
});
