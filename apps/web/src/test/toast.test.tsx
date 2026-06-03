// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast, type ToastTone } from '../ui/Toast';

function Harness({ tone, body }: { tone?: ToastTone; body?: string }) {
  const push = useToast();
  return (
    <button type="button" onClick={() => push({ tone, title: 'Saved', body })}>
      fire
    </button>
  );
}

describe('Toast', () => {
  it('pushes a toast (with body) and dismisses it via the close button', async () => {
    render(
      <ToastProvider>
        <Harness tone="danger" body="all good" />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText('fire'));
    expect(screen.getByText(/Saved/)).toBeInTheDocument();
    expect(screen.getByText('all good')).toBeInTheDocument();
    // G3: a danger toast is announced assertively via role="alert".
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('cerrar'));
    expect(screen.queryByText(/Saved/)).not.toBeInTheDocument();
  });

  it('defaults the tone to ok and renders fine without a body', async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText('fire'));
    expect(screen.getByText(/Saved/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // ok/warn stay polite
  });
});
