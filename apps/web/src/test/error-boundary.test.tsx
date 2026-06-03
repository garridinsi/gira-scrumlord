// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../ui/ErrorBoundary';

// Don't hit the network sink during the test; just assert the boundary behaves.
vi.mock('../api/client', () => ({ reportClientError: vi.fn() }));

function Boom(): never {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  it('renders the fallback on a child crash and recovers via Retry once the child is healthy', async () => {
    // React logs the caught error to console.error — silence it for a clean run.
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    // Fallback chrome + the actual message are shown.
    expect(screen.getByText('ALGO SE ROMPIÓ')).toBeInTheDocument();
    expect(screen.getByText('kaboom')).toBeInTheDocument();

    // Swap to a healthy child: error state is sticky, so the fallback persists…
    rerender(
      <ErrorBoundary>
        <div>healthy now</div>
      </ErrorBoundary>,
    );
    expect(screen.queryByText('healthy now')).not.toBeInTheDocument();

    // …until Retry clears it and the (now healthy) child renders.
    await userEvent.click(screen.getByText(/Reintentar/));
    expect(screen.getByText('healthy now')).toBeInTheDocument();

    err.mockRestore();
  });

  it('reportClientError is invoked when a crash is caught', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { reportClientError } = await import('../api/client');
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(reportClientError).toHaveBeenCalledWith(expect.objectContaining({ message: 'kaboom' }));
    err.mockRestore();
  });
});
