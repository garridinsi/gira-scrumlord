// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

const { useMeFn, overview } = vi.hoisted(() => ({ useMeFn: vi.fn(), overview: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({
  useMe: () => useMeFn(),
  useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock('../api/client', () => ({ portal: { overview: () => overview() } }));

import { ClientPortalLayout } from '../components/layout/ClientPortalLayout';

function renderApp(route = '/portal') {
  return renderWithProviders(
    <Routes>
      <Route path="/portal" element={<ClientPortalLayout />}>
        <Route index element={<div>portal content</div>} />
      </Route>
      <Route path="/login" element={<div>login-page</div>} />
      <Route path="/projects" element={<div>projects-page</div>} />
    </Routes>,
    { route },
  );
}

describe('ClientPortalLayout', () => {
  beforeEach(() => {
    useMeFn.mockReset();
    overview.mockReset().mockResolvedValue({ client: { name: 'Acme Corp' } });
  });

  it('renders the portal shell + outlet for a client user', async () => {
    useMeFn.mockReturnValue({
      data: { id: 'u1', name: 'Client User', kind: 'client' },
      isLoading: false,
    });
    renderApp('/portal');
    expect(await screen.findByText('portal content')).toBeInTheDocument();
    expect(screen.getByText('GIRA')).toBeInTheDocument();
  });

  it('redirects a staff user to /projects', () => {
    useMeFn.mockReturnValue({ data: { id: 'u1', kind: 'staff' }, isLoading: false });
    renderApp('/portal');
    expect(screen.getByText('projects-page')).toBeInTheDocument();
  });

  it('redirects an unauthenticated user to /login', () => {
    useMeFn.mockReturnValue({ data: undefined, isLoading: false });
    renderApp('/portal');
    expect(screen.getByText('login-page')).toBeInTheDocument();
  });
});
