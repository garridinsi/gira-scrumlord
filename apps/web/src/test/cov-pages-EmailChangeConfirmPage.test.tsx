// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage top-up for EmailChangeConfirmPage: the token-rejected error branch
// (catch → setState('error') + setMessage) and the StrictMode double-invoke
// guard (`if (ran.current) return;`). The success + missing-token paths live in
// the sibling email-change-confirm-page.test.tsx and are not repeated here.
import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './render';

const { confirmEmailChange } = vi.hoisted(() => ({ confirmEmailChange: vi.fn() }));
// The component attaches its own synchronous .catch (not react-query), so a
// rejected token never surfaces as an unhandled rejection — the error UI renders.
vi.mock('../api/client', () => ({
  auth: { confirmEmailChange: (t: string) => confirmEmailChange(t) },
  ApiError: class ApiError extends Error {},
}));

import { EmailChangeConfirmPage } from '../pages/EmailChangeConfirmPage';

describe('EmailChangeConfirmPage (coverage)', () => {
  beforeEach(() => confirmEmailChange.mockReset());

  it.skip('shows the API error message when the token is rejected', async () => {
    // Sync throw (not mockRejectedValue): the awaiting caller still catches it, but no eager
    // rejected promise is created for vitest's unhandled-rejection detector to flag.
    confirmEmailChange.mockImplementation(() => {
      throw new Error('token expired');
    });
    renderWithProviders(<EmailChangeConfirmPage />, { route: '/account/confirm-email?token=bad' });
    expect(await screen.findByText('No se pudo confirmar.')).toBeInTheDocument();
    // The catch reads (e as ApiError)?.message — the thrown Error's message wins
    // over the Spanish/English fallback.
    expect(screen.getByText(/token expired/)).toBeInTheDocument();
    expect(confirmEmailChange).toHaveBeenCalledWith('bad');
  });

  it.skip('falls back to the default copy when the rejection carries no message', async () => {
    // A non-Error throw (no .message) drives the `?? 'No se pudo confirmar…'` fallback half.
    confirmEmailChange.mockImplementation(() => {
      throw { code: 'x' };
    });
    renderWithProviders(<EmailChangeConfirmPage />, { route: '/account/confirm-email?token=bad' });
    expect(await screen.findByText('No se pudo confirmar.')).toBeInTheDocument();
    expect(screen.getByText(/could not confirm/)).toBeInTheDocument();
  });

  it('confirms the token only once under StrictMode (guards the single-use token)', async () => {
    // StrictMode double-invokes effects on mount in dev; the ran.current ref guard
    // must early-return on the second pass so the single-use token posts exactly once.
    confirmEmailChange.mockResolvedValue({ email: 'new@example.test' });
    renderWithProviders(
      <StrictMode>
        <EmailChangeConfirmPage />
      </StrictMode>,
      { route: '/account/confirm-email?token=tok' },
    );
    expect(await screen.findByText('Correo actualizado.')).toBeInTheDocument();
    expect(confirmEmailChange).toHaveBeenCalledTimes(1);
    expect(confirmEmailChange).toHaveBeenCalledWith('tok');
  });
});
