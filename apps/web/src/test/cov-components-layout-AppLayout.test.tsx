// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-focused cases for AppLayout: the loading state (me.isLoading), the mobile
// off-canvas drawer (navOpen) — the app--nav-open class, the Escape-to-close keydown
// effect, the rail-backdrop button, and the TopBar/Rail close handlers wired to navOpen.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

// useMe is a hoisted spy so each case can drive a different auth state.
const { useMeFn } = vi.hoisted(() => ({ useMeFn: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useMe: () => useMeFn() }));

// Stub the heavy chrome. The factories run hoisted (before the jsdom test env wires up),
// so we build elements with createElement — never a JSX literal, which would touch
// `document` too early. The TopBar stub exposes a real menu button wired to onMenuClick
// so a test can toggle the drawer; the Rail stub exposes a button wired to onNavigate so
// the AppLayout-side close handler (onNavigate={() => setNavOpen(false)}) runs.
const { topBarStub, railStub } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createElement } = require('react');
  const topBarStub = ({ onMenuClick }: { onMenuClick?: () => void }) =>
    createElement(
      'button',
      { type: 'button', 'aria-label': 'menu-toggle', onClick: () => onMenuClick?.() },
      '☰',
    );
  const railStub = ({ onNavigate }: { onNavigate?: () => void }) =>
    createElement(
      'button',
      { type: 'button', 'aria-label': 'rail-nav', onClick: () => onNavigate?.() },
      'rail',
    );
  return { topBarStub, railStub };
});
vi.mock('../components/layout/TopBar', () => ({ TopBar: topBarStub }));
vi.mock('../components/layout/Rail', () => ({ Rail: railStub }));

import { AppLayout } from '../components/layout/AppLayout';

function renderApp(route = '/') {
  return renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<div>protected content</div>} />
      </Route>
      <Route path="/login" element={<div>login-page</div>} />
    </Routes>,
    { route },
  );
}

describe('AppLayout (coverage)', () => {
  beforeEach(() => useMeFn.mockReset());

  it('renders the loading state while the session is being checked', () => {
    // me.isLoading true → the early "verificando sesión" gate renders (lines 30-38) and
    // neither the shell nor a redirect happens.
    useMeFn.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    renderApp('/');
    expect(screen.getByText('verificando sesión · checking session')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('starts with the drawer closed (no app--nav-open) and toggles it open via the TopBar menu', async () => {
    useMeFn.mockReturnValue({
      data: { id: 'u1', role: 'admin' },
      isLoading: false,
      isError: false,
    });
    const { container } = renderApp('/');

    // Closed: line 50 false branch → root .app lacks app--nav-open; the backdrop button
    // (lines 57-63) is not rendered.
    const root = container.querySelector('.app')!;
    expect(root.className).not.toContain('app--nav-open');
    expect(
      screen.queryByRole('button', { name: 'Cerrar menú · Close menu' }),
    ).not.toBeInTheDocument();

    // Toggle open via TopBar onMenuClick → setNavOpen(true) (line 54). Line 50 true branch
    // adds app--nav-open; the backdrop button (lines 57-63) now renders.
    await userEvent.click(screen.getByRole('button', { name: 'menu-toggle' }));
    expect(root.className).toContain('app--nav-open');
    expect(screen.getByRole('button', { name: 'Cerrar menú · Close menu' })).toBeInTheDocument();
  });

  it('closes the open drawer when the rail-backdrop button is clicked', async () => {
    useMeFn.mockReturnValue({
      data: { id: 'u1', role: 'admin' },
      isLoading: false,
      isError: false,
    });
    const { container } = renderApp('/');
    const root = container.querySelector('.app')!;

    await userEvent.click(screen.getByRole('button', { name: 'menu-toggle' }));
    expect(root.className).toContain('app--nav-open');

    // Click the backdrop → onClick={() => setNavOpen(false)} (lines 58-62) closes the drawer.
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar menú · Close menu' }));
    expect(root.className).not.toContain('app--nav-open');
    expect(
      screen.queryByRole('button', { name: 'Cerrar menú · Close menu' }),
    ).not.toBeInTheDocument();
  });

  it('closes the open drawer when the Rail fires onNavigate', async () => {
    useMeFn.mockReturnValue({
      data: { id: 'u1', role: 'admin' },
      isLoading: false,
      isError: false,
    });
    const { container } = renderApp('/');
    const root = container.querySelector('.app')!;

    await userEvent.click(screen.getByRole('button', { name: 'menu-toggle' }));
    expect(root.className).toContain('app--nav-open');

    // Rail's onNavigate prop is AppLayout's () => setNavOpen(false) (line 56) → closes drawer.
    await userEvent.click(screen.getByRole('button', { name: 'rail-nav' }));
    expect(root.className).not.toContain('app--nav-open');
  });

  it('closes the open drawer when Escape is pressed (and ignores other keys)', async () => {
    useMeFn.mockReturnValue({
      data: { id: 'u1', role: 'admin' },
      isLoading: false,
      isError: false,
    });
    const { container } = renderApp('/');
    const root = container.querySelector('.app')!;

    // Open so the keydown effect (lines 21-28) is active: !navOpen guard passes, listener
    // is added (line 26).
    await userEvent.click(screen.getByRole('button', { name: 'menu-toggle' }));
    expect(root.className).toContain('app--nav-open');

    // A non-Escape key hits the handler (line 23) but the Escape branch (line 24) is false,
    // so the drawer stays open.
    await userEvent.keyboard('a');
    expect(root.className).toContain('app--nav-open');

    // Escape → e.key === 'Escape' true → setNavOpen(false) (line 24) closes the drawer; the
    // effect cleanup (line 27) then removes the listener.
    await userEvent.keyboard('{Escape}');
    expect(root.className).not.toContain('app--nav-open');
  });
});
