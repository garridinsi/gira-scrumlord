// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

const { useMeFn } = vi.hoisted(() => ({ useMeFn: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useMe: () => useMeFn() }));
// Stub the heavy chrome so AppLayout's own guard + Outlet render without their deps.
// (Return null, not JSX — a JSX literal inside a hoisted vi.mock factory misbehaves.)
vi.mock('../components/layout/TopBar', () => ({ TopBar: () => null }));
vi.mock('../components/layout/Rail', () => ({ Rail: () => null }));

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

describe('AppLayout', () => {
  beforeEach(() => useMeFn.mockReset());

  it('redirects to /login when unauthenticated', () => {
    useMeFn.mockReturnValue({ data: undefined, isLoading: false });
    renderApp('/');
    expect(screen.getByText('login-page')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('renders the shell and the routed outlet when authenticated', () => {
    useMeFn.mockReturnValue({ data: { id: 'u1', role: 'admin' }, isLoading: false });
    renderApp('/');
    expect(screen.getByText('protected content')).toBeInTheDocument(); // Outlet renders
  });

  it('redirects a client user to the portal', () => {
    useMeFn.mockReturnValue({
      data: { id: 'u1', role: 'viewer', kind: 'client' },
      isLoading: false,
    });
    renderApp('/');
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });
});
