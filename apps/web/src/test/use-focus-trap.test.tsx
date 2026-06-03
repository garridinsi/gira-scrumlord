// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

function Dialog({ onClose }: { onClose: () => void }) {
  const ref = useFocusTrap<HTMLDivElement>(true, onClose);
  return (
    <div ref={ref} role="dialog" aria-label="Test" tabIndex={-1}>
      <button>first</button>
      <button>last</button>
    </div>
  );
}

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>open</button>
      {open && <Dialog onClose={() => setOpen(false)} />}
    </div>
  );
}

describe('useFocusTrap', () => {
  it('moves focus into the dialog on open', () => {
    render(<Dialog onClose={() => {}} />);
    // first focusable inside the dialog receives focus
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }));
  });

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the opener when the dialog unmounts', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'open' });
    opener.focus();
    await userEvent.click(opener);
    // focus moved into the dialog
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }));
    // Escape closes it → dialog unmounts → focus returns to the opener
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it('wraps Tab from the last focusable back to the first', async () => {
    render(<Dialog onClose={() => {}} />);
    const first = screen.getByRole('button', { name: 'first' });
    const last = screen.getByRole('button', { name: 'last' });
    last.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(first);
  });
});
