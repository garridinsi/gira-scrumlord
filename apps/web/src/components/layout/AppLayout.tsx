// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMe } from '../../hooks/useAuth';
import { Rail } from './Rail';
import { TopBar } from './TopBar';

export function AppLayout() {
  const me = useMe();
  const { pathname } = useLocation();
  // On phones the rail is an off-canvas drawer toggled from the TopBar hamburger.
  const [navOpen, setNavOpen] = useState(false);

  // Close the drawer on any navigation (back/forward, topbar links, redirects) so it
  // never covers the page you just landed on.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Escape closes the drawer (it behaves as a modal surface on phones).
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  if (me.isLoading) {
    return (
      <div className="app">
        <div className="gs-state">
          <span className="gs-loading">verificando sesión · checking session</span>
        </div>
      </div>
    );
  }

  if (me.isError || !me.data) {
    return <Navigate to="/login" replace />;
  }

  // Client users belong in the portal, not the staff app
  if (me.data.kind === 'client') {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div className={'app' + (navOpen ? ' app--nav-open' : '')}>
      <TopBar onMenuClick={() => setNavOpen((v) => !v)} />
      <div className="main">
        <Rail open={navOpen} onNavigate={() => setNavOpen(false)} />
        {navOpen && (
          <button
            type="button"
            className="rail-backdrop"
            aria-label="Cerrar menú · Close menu"
            onClick={() => setNavOpen(false)}
          />
        )}
        <Outlet />
      </div>
    </div>
  );
}
