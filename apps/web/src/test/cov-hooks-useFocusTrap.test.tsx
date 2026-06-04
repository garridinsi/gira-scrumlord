// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage for src/hooks/useFocusTrap.ts: the branches the sibling use-focus-trap.test.tsx
// does not reach — the inactive early-return, the empty-dialog fallbacks (focus the
// container, and Tab with no focusable items), Shift+Tab wrapping first→last, and Tab
// pulling escaped focus back inside the container.
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFocusTrap } from '../hooks/useFocusTrap';

// Dialog with two focusable buttons; `active` is parameterised so we can exercise the
// inactive path. An outside button lets us move focus out of the trap.
function Dialog({ active = true }: { active?: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>(active);
  return (
    <div>
      <button>outside</button>
      <div ref={ref} role="dialog" aria-label="Test" tabIndex={-1}>
        <button>first</button>
        <button>last</button>
      </div>
    </div>
  );
}

// Dialog with no focusable descendants: on open focus falls back to the container, and
// Tab has no items to cycle.
function EmptyDialog() {
  const ref = useFocusTrap<HTMLDivElement>(true);
  return (
    <div ref={ref} role="dialog" aria-label="Empty" tabIndex={-1}>
      <p>nothing focusable here</p>
    </div>
  );
}

describe('useFocusTrap (coverage)', () => {
  it('does nothing while inactive (early return, no focus moved)', () => {
    render(<Dialog active={false} />);
    // Effect short-circuits on !active: the first focusable is NOT auto-focused.
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'first' }));
  });

  it('falls back to focusing the container when there is nothing focusable inside', () => {
    render(<EmptyDialog />);
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('keeps focus on the container when Tab is pressed in an empty dialog', () => {
    render(<EmptyDialog />);
    const dialog = screen.getByRole('dialog');
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: 'Tab' });
    // items.length === 0 branch: preventDefault + container.focus() keep focus put.
    expect(document.activeElement).toBe(dialog);
  });

  it('wraps Shift+Tab from the first focusable back to the last', async () => {
    render(<Dialog />);
    const first = screen.getByRole('button', { name: 'first' });
    const last = screen.getByRole('button', { name: 'last' });
    first.focus();
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });

  it('pulls focus back to the first focusable when Tab fires from outside the trap', () => {
    render(<Dialog />);
    const outside = screen.getByRole('button', { name: 'outside' });
    const first = screen.getByRole('button', { name: 'first' });
    // Move focus out of the container, then dispatch Tab on the trap container itself.
    outside.focus();
    expect(document.activeElement).toBe(outside);
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Tab' });
    // !container.contains(activeEl) branch: preventDefault + first.focus().
    expect(document.activeElement).toBe(first);
  });
});
