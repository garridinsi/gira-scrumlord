// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for PortalRequestPage:
//   - lines 47-52: the createRequest `onError` handler. A rejected mutation fires
//     the danger toast; an Error rejection drives the `err.message` arm of line 50
//     and a non-Error rejection drives the `String(err)` fallback arm.
//   - line 241: the char-counter colour ternary `title.length > 160 ? red : muted`.
//     Typing a > 160-char title takes the (uncovered) red/true arm; we assert the
//     rendered "<n>/200" counter to prove that path executed.
//   - line 275: the submit-button label ternary `isPending ? 'Enviando…' : 'Enviar…'`.
//     A never-resolving mutation keeps `createRequest.isPending` true so the page
//     shows the "Enviando · Sending…" label (uncovered true arm).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

const { overview, createRequest, toastSpy } = vi.hoisted(() => ({
  overview: vi.fn(),
  createRequest: vi.fn(),
  toastSpy: vi.fn(),
}));
// The page imports '../../api/client'; from src/test/ that resolves to '../api/client'.
vi.mock('../api/client', () => ({
  portal: { overview: () => overview(), createRequest: (d: unknown) => createRequest(d) },
}));
vi.mock('../ui/Toast', () => ({ useToast: () => toastSpy }));

import { PortalRequestPage } from '../pages/portal/PortalRequestPage';

const overviewWith = (projects: Array<{ key: string; name: string }>) => ({
  projects: projects.map((p) => ({
    ...p,
    open: 0,
    inProgress: 0,
    done: 0,
    totalMinutes: 0,
    accruedCents: 0,
  })),
  totals: { open: 0, inProgress: 0, done: 0, totalMinutes: 0, accruedCents: 0, currency: 'EUR' },
  client: { name: 'Acme', currency: 'EUR' },
});

describe('PortalRequestPage (coverage)', () => {
  beforeEach(() => {
    overview.mockReset();
    createRequest.mockReset();
    toastSpy.mockReset();
  });

  it('fires the danger toast with err.message when the request submission fails', async () => {
    overview.mockResolvedValue(overviewWith([{ key: 'ALFA', name: 'Alfa' }]));
    createRequest.mockRejectedValue(new Error('boom'));
    renderWithProviders(<PortalRequestPage />);

    expect(await screen.findByText('ALFA')).toBeInTheDocument(); // single-project indicator
    await userEvent.type(screen.getByLabelText(/Title/i), 'It broke');
    await userEvent.click(screen.getByRole('button', { name: /Submit request/ }));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al enviar · Submission failed',
          body: 'boom',
        }),
      ),
    );
  });

  it('uses the String(err) fallback in the danger toast for a non-Error rejection', async () => {
    overview.mockResolvedValue(overviewWith([{ key: 'ALFA', name: 'Alfa' }]));
    createRequest.mockRejectedValue('plain string failure');
    renderWithProviders(<PortalRequestPage />);

    expect(await screen.findByText('ALFA')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Title/i), 'It broke');
    await userEvent.click(screen.getByRole('button', { name: /Submit request/ }));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al enviar · Submission failed',
          body: 'plain string failure',
        }),
      ),
    );
  });

  it('turns the char counter to its over-limit arm past 160 characters', async () => {
    overview.mockResolvedValue(overviewWith([{ key: 'ALFA', name: 'Alfa' }]));
    renderWithProviders(<PortalRequestPage />);

    expect(await screen.findByText('ALFA')).toBeInTheDocument();
    const longTitle = 'x'.repeat(170); // > 160 → red/true arm of the colour ternary
    await userEvent.type(screen.getByLabelText(/Title/i), longTitle);

    // The counter span re-renders with the new length; its presence proves the
    // `title.length > 160` branch was taken on this render.
    expect(await screen.findByText('170/200')).toBeInTheDocument();
  });

  it('shows the "Enviando · Sending…" label while the mutation is pending', async () => {
    overview.mockResolvedValue(overviewWith([{ key: 'ALFA', name: 'Alfa' }]));
    // Never resolves → createRequest.isPending stays true after submit.
    createRequest.mockReturnValue(new Promise<never>(() => {}));
    renderWithProviders(<PortalRequestPage />);

    expect(await screen.findByText('ALFA')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Title/i), 'It broke');
    await userEvent.click(screen.getByRole('button', { name: /Submit request/ }));

    expect(await screen.findByText('Enviando · Sending…')).toBeInTheDocument();
  });
});
