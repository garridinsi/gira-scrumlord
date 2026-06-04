// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-focused cases for ClientPortalLayout: the loading gate (me.isLoading,
// lines 21-29), the clientName fallback to me.data.name when the overview query has
// no client (line 40), the NavLink className callbacks for every portal nav item
// (lines 68/76/84/92/101 — exercised on render, with the active branch driven by the
// current route), and handleLogout wiring (lines 43-46) plus the isPending button
// label (line 116).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

// Hoisted spies so each case can drive a different auth/logout state.
const { useMeFn, overview, logoutMutate, logoutState } = vi.hoisted(() => ({
  useMeFn: vi.fn(),
  overview: vi.fn(),
  logoutMutate: vi.fn(),
  logoutState: { isPending: false },
}));
vi.mock('../hooks/useAuth', () => ({
  useMe: () => useMeFn(),
  useLogout: () => ({ mutate: logoutMutate, isPending: logoutState.isPending }),
}));
vi.mock('../api/client', () => ({ portal: { overview: () => overview() } }));

import { ClientPortalLayout } from '../components/layout/ClientPortalLayout';

function renderApp(route = '/portal') {
  return renderWithProviders(
    <Routes>
      <Route path="/portal" element={<ClientPortalLayout />}>
        <Route index element={<div>portal content</div>} />
        <Route path="issues" element={<div>issues content</div>} />
        <Route path="request" element={<div>request content</div>} />
      </Route>
      <Route path="/login" element={<div>login-page</div>} />
      <Route path="/projects" element={<div>projects-page</div>} />
    </Routes>,
    { route },
  );
}

const clientMe = { data: { id: 'u1', name: 'Client User', kind: 'client' }, isLoading: false };

describe('ClientPortalLayout (coverage)', () => {
  beforeEach(() => {
    useMeFn.mockReset();
    overview.mockReset().mockResolvedValue({ client: { name: 'Acme Corp' } });
    logoutMutate.mockReset();
    logoutState.isPending = false;
  });

  it('renders the loading gate while the session is being checked', () => {
    // me.isLoading true → the early "verificando sesión" shell renders (lines 21-29);
    // neither the portal chrome nor the outlet is shown.
    useMeFn.mockReturnValue({ data: undefined, isLoading: true });
    renderApp('/portal');
    expect(screen.getByText('verificando sesión · checking session')).toBeInTheDocument();
    expect(screen.queryByText('GIRA')).not.toBeInTheDocument();
    expect(screen.queryByText('portal content')).not.toBeInTheDocument();
  });

  it('falls back to me.data.name when the overview has no client (line 40)', async () => {
    // overview resolves without a client → clientName = me.data.name. The same render
    // exercises the Overview NavLink active className branch (isActive true, line 68)
    // and the non-active className branch on the other nav items.
    useMeFn.mockReturnValue(clientMe);
    overview.mockResolvedValue({ client: null });
    renderApp('/portal');
    expect(await screen.findByText('portal content')).toBeInTheDocument();
    // brand client label shows the user's own name (the ?? fallback).
    expect(screen.getAllByText('Client User').length).toBeGreaterThan(0);
  });

  it('marks the CTA "New request" nav item active on its route (line 101 active branch)', async () => {
    useMeFn.mockReturnValue(clientMe);
    const { container } = renderApp('/portal/request');
    expect(await screen.findByText('request content')).toBeInTheDocument();
    // The CTA NavLink className callback ran with isActive true → both modifier classes.
    const cta = container.querySelector('.cp-nav__item--cta')!;
    expect(cta.className).toContain('cp-nav__item--active');
  });

  it('drives handleLogout: mutate is called and onSuccess navigates to /login (lines 43-46)', async () => {
    useMeFn.mockReturnValue(clientMe);
    // Invoke the onSuccess callback synchronously so navigate('/login') runs.
    logoutMutate.mockImplementation((_input: unknown, opts?: { onSuccess?: () => void }) => {
      opts?.onSuccess?.();
    });
    renderApp('/portal');
    expect(await screen.findByText('portal content')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Salir · Logout' }));
    expect(logoutMutate).toHaveBeenCalledTimes(1);
    // onSuccess → navigate('/login', { replace: true }) lands on the login route.
    expect(await screen.findByText('login-page')).toBeInTheDocument();
  });

  it('shows the pending ellipsis on the logout button while logout is in flight (line 116)', async () => {
    useMeFn.mockReturnValue(clientMe);
    logoutState.isPending = true;
    renderApp('/portal');
    expect(await screen.findByText('portal content')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: '…' });
    expect(btn).toBeDisabled();
    expect(screen.queryByText('Salir · Logout')).not.toBeInTheDocument();
  });
});
