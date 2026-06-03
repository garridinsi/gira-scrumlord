// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

// vi.hoisted so the mock factory (hoisted above imports) can close over the spy.
const { magicLink } = vi.hoisted(() => ({ magicLink: vi.fn() }));
vi.mock('../api/client', () => ({ auth: { magicLink: (e: string) => magicLink(e) } }));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: undefined }) }));

import { LoginPage } from '../pages/LoginPage';

describe('LoginPage', () => {
  beforeEach(() => magicLink.mockReset());

  it('sends a magic link for the typed email and shows the inbox confirmation', async () => {
    magicLink.mockResolvedValue({});
    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByPlaceholderText('tu@correo.eus'), 'me@example.test');
    await userEvent.click(screen.getByRole('button', { name: /Mail me the link/i }));

    await waitFor(() => expect(magicLink).toHaveBeenCalledWith('me@example.test'));
    expect(await screen.findByText(/CHECK YOUR INBOX/i)).toBeInTheDocument();
    expect(screen.getByText(/me@example.test/)).toBeInTheDocument(); // the address is echoed back
  });

  it('lets you go back to edit the email after sending', async () => {
    magicLink.mockResolvedValue({});
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByPlaceholderText('tu@correo.eus'), 'me@example.test');
    await userEvent.click(screen.getByRole('button', { name: /Mail me the link/i }));
    expect(await screen.findByText(/CHECK YOUR INBOX/i)).toBeInTheDocument();

    // The "otro correo" reset returns to the form.
    await userEvent.click(screen.getByRole('button', { name: /Otro correo/i }));
    expect(screen.getByPlaceholderText('tu@correo.eus')).toBeInTheDocument();
  });
});
