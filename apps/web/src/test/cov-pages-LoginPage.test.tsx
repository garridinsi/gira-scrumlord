// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage closer for LoginPage: exercises the already-authenticated <Navigate>
// redirect (line 14), the pending-submit button label (line 362), and the
// generic send-failure <div role="alert"> error block (lines 365-387). The
// happy path / inbox confirmation / reset are already covered by login-page.test.tsx.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

// vi.hoisted so the mock factories (hoisted above imports) can close over the spies.
const { magicLink } = vi.hoisted(() => ({ magicLink: vi.fn() }));
vi.mock('../api/client', () => ({ auth: { magicLink: (e: string) => magicLink(e) } }));

// Mutable holder lets each test choose what useMe() resolves to (authenticated or not).
const me = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: me.data }) }));

import { LoginPage } from '../pages/LoginPage';

describe('LoginPage — coverage', () => {
  beforeEach(() => {
    magicLink.mockReset();
    me.data = undefined;
  });

  it('redirects away from the login form once the session is already authenticated', () => {
    // me.data truthy → `if (me.data) return <Navigate to="/projects" replace />`.
    me.data = { id: 'u1', email: 'me@example.test', role: 'admin' };
    renderWithProviders(<LoginPage />);

    // The <Navigate> short-circuits before the form renders, so none of the
    // login card is on screen.
    expect(screen.queryByPlaceholderText('tu@correo.eus')).not.toBeInTheDocument();
    expect(screen.queryByText('ACCEDE.')).not.toBeInTheDocument();
  });

  it('shows the pending button label while the magic-link request is in flight', async () => {
    // A promise that never settles keeps the mutation in its isPending state.
    let resolve: () => void = () => {};
    magicLink.mockReturnValue(
      new Promise<void>((r) => {
        resolve = r;
      }),
    );
    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByPlaceholderText('tu@correo.eus'), 'me@example.test');
    await userEvent.click(screen.getByRole('button', { name: /Mail me the link/i }));

    // isPending → 'Enviando…' label, and the submit button is disabled.
    const pendingBtn = await screen.findByRole('button', { name: 'Enviando…' });
    expect(pendingBtn).toBeInTheDocument();
    expect(pendingBtn).toBeDisabled();

    // Let the dangling promise settle so it doesn't leak past the test.
    resolve();
  });

  it('renders the generic send-failure alert when the magic-link request rejects', async () => {
    // mockRejectedValue drives the mutation into its isError branch; the
    // no-op mutationCache in renderWithProviders swallows the rejection.
    magicLink.mockRejectedValue(new Error('network down'));
    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByPlaceholderText('tu@correo.eus'), 'me@example.test');
    await userEvent.click(screen.getByRole('button', { name: /Mail me the link/i }));

    // The error block renders as an alert with the bilingual generic copy.
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos enviar el enlace ahora mismo. Inténtalo de nuevo.');
    expect(alert).toHaveTextContent(/Couldn’t send the link right now — please try again\./);

    // It stays on the form (still in the !sent branch); no inbox confirmation.
    expect(screen.getByPlaceholderText('tu@correo.eus')).toBeInTheDocument();
    expect(screen.queryByText(/CHECK YOUR INBOX/i)).not.toBeInTheDocument();

    // The mutation actually attempted the typed address.
    await waitFor(() => expect(magicLink).toHaveBeenCalledWith('me@example.test'));
  });
});
