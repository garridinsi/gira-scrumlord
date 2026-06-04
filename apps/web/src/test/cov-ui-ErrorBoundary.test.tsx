// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for src/ui/ErrorBoundary.tsx. The sibling
// error-boundary.test.tsx only ever throws `new Error('kaboom')`, which leaves the
// *fallback* arms of the crash-report payload and the rendered message cold:
//   - line 27: `error.message || String(error)`            (the `String(error)` arm)
//   - line 28: `error.stack ?? undefined`                  (the `undefined` arm)
//   - line 29: `info.componentStack ?? undefined`          (the `undefined` arm)
//   - line 123: `this.state.error.message || String(...)`  (the `String(...)` arm)
// We drive these with an error that has an empty message and no stack, plus an
// ErrorInfo whose componentStack is null. (Line 30's `: undefined` SSR arm is
// unreachable under jsdom — window is always defined — and is v8-ignored at source.)
import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({ reportClientError: vi.fn() }));
// Don't hit the network sink; capture the payload the boundary forwards instead.
vi.mock('../api/client', () => ({ reportClientError: (p: unknown) => h.reportClientError(p) }));

import { ErrorBoundary } from '../ui/ErrorBoundary';

// A messageless, stackless child crash: `.message` is '' (falsy) so both the
// payload (line 27) and the rendered <pre> (line 123) fall back to String(error).
function SilentBoom(): never {
  const e = new Error('');
  // Engines populate `.stack`; clear it to exercise the `?? undefined` arm (line 28).
  e.stack = undefined;
  throw e;
}

describe('ErrorBoundary coverage', () => {
  beforeEach(() => {
    h.reportClientError.mockReset();
  });

  it('renders String(error) in the <pre> when the caught error has an empty message (line 123)', () => {
    // React logs the caught error to console.error — silence it for a clean run.
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <SilentBoom />
      </ErrorBoundary>,
    );

    // Fallback chrome is present and the messageless error renders as String(error) = 'Error'.
    expect(screen.getByText('ALGO SE ROMPIÓ')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();

    err.mockRestore();
  });

  it('forwards the fallback payload arms when message/stack/componentStack are absent (lines 27-29)', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Grab the live boundary instance so we can hand componentDidCatch a crafted
    // error + ErrorInfo, controlling every fallback arm of the payload at once.
    const ref = createRef<ErrorBoundary>();
    render(
      <ErrorBoundary ref={ref}>
        <div>ok</div>
      </ErrorBoundary>,
    );

    const crashed = new Error('');
    crashed.stack = undefined;
    // componentStack null → line 29's `?? undefined` arm.
    ref.current!.componentDidCatch(crashed, { componentStack: null });

    expect(h.reportClientError).toHaveBeenCalledWith({
      message: 'Error', // line 27: '' is falsy → String(error)
      stack: undefined, // line 28: no stack → undefined
      componentStack: undefined, // line 29: null → undefined
      url: window.location.href, // line 30: window is defined in jsdom
    });

    err.mockRestore();
  });
});
