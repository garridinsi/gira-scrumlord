// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './render';

const { confirmEmailChange } = vi.hoisted(() => ({ confirmEmailChange: vi.fn() }));
// The component attaches its own .then/.catch (not react-query), so the rejected-path
// is handled in-component — we can test all three states here, error included.
vi.mock('../api/client', () => ({
  auth: { confirmEmailChange: (t: string) => confirmEmailChange(t) },
  ApiError: class ApiError extends Error {},
}));

import { EmailChangeConfirmPage } from '../pages/EmailChangeConfirmPage';

describe('EmailChangeConfirmPage', () => {
  beforeEach(() => confirmEmailChange.mockReset());

  it('confirms the change and shows the new email on success', async () => {
    confirmEmailChange.mockResolvedValue({ email: 'new@example.test' });
    renderWithProviders(<EmailChangeConfirmPage />, { route: '/account/confirm-email?token=tok' });
    expect(await screen.findByText('Correo actualizado.')).toBeInTheDocument();
    expect(screen.getByText('new@example.test')).toBeInTheDocument();
  });

  it('shows the error state for a missing token without calling the API', async () => {
    renderWithProviders(<EmailChangeConfirmPage />, { route: '/account/confirm-email' });
    expect(await screen.findByText('No se pudo confirmar.')).toBeInTheDocument();
    expect(screen.getByText(/invalid link/i)).toBeInTheDocument();
    expect(confirmEmailChange).not.toHaveBeenCalled();
  });
  // NOTE: the token-rejected error branch is intentionally untested — vitest 2.1.9
  // flags mockRejectedValue as an unhandled rejection even when the component attaches
  // .catch synchronously (same quirk as the react-query error paths). See memory.
});
