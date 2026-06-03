// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './render';

const { callback } = vi.hoisted(() => ({ callback: vi.fn() }));
vi.mock('../api/client', () => ({ auth: { callback: (t: string) => callback(t) } }));

import { AuthCallbackPage } from '../pages/AuthCallbackPage';

describe('AuthCallbackPage', () => {
  beforeEach(() => callback.mockReset());

  it('exchanges the token from the URL', async () => {
    callback.mockResolvedValue({ user: { id: 'u1', name: 'Ada' } });
    renderWithProviders(<AuthCallbackPage />, { route: '/auth/callback?token=goodtoken' });
    await waitFor(() => expect(callback).toHaveBeenCalledWith('goodtoken'));
  });

  it('shows the invalid-link state and exchanges nothing when no token is present', () => {
    renderWithProviders(<AuthCallbackPage />, { route: '/auth/callback' });
    expect(screen.getByText('ENLACE INVÁLIDO')).toBeInTheDocument();
    expect(screen.getByText(/Back to login/)).toBeInTheDocument();
    expect(callback).not.toHaveBeenCalled();
  });
});
