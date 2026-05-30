// SPDX-License-Identifier: GPL-3.0-or-later
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portal } from '../../api/client';
import { useMe, useLogout } from '../../hooks/useAuth';
import { Glyph } from '../../ui/atoms';

export function ClientPortalLayout() {
  const me = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  const overviewQ = useQuery({
    queryKey: ['portal', 'overview'],
    queryFn: () => portal.overview(),
    enabled: me.data?.kind === 'client',
    staleTime: 60_000,
  });

  // Auth guard
  if (me.isLoading) {
    return (
      <div className="cp-shell">
        <div className="gs-state">
          <span className="gs-loading">verificando sesión · checking session</span>
        </div>
      </div>
    );
  }

  if (me.isError || !me.data) {
    return <Navigate to="/login" replace />;
  }

  // Staff users don't belong here
  if (me.data.kind !== 'client') {
    return <Navigate to="/projects" replace />;
  }

  const clientName = overviewQ.data?.client?.name ?? me.data.name;

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => navigate('/login', { replace: true }),
    });
  }

  return (
    <div className="cp-shell">
      {/* ── Top bar ────────────────────────────────────────────── */}
      <header className="cp-topbar">
        <div className="cp-topbar__brand">
          <Glyph />
          <span className="cp-topbar__brand-name">GIRA</span>
          <span className="cp-topbar__brand-sep">|</span>
          <span
            className="cp-topbar__client"
            title={clientName}
          >
            {clientName}
          </span>
        </div>

        <nav className="cp-nav" aria-label="portal navigation">
          <NavLink
            to="/portal"
            end
            className={({ isActive }) =>
              'cp-nav__item' + (isActive ? ' cp-nav__item--active' : '')
            }
          >
            <span className="cp-nav__es">Resumen</span>
            <span className="cp-nav__en">Overview</span>
          </NavLink>

          <NavLink
            to="/portal/issues"
            className={({ isActive }) =>
              'cp-nav__item' + (isActive ? ' cp-nav__item--active' : '')
            }
          >
            <span className="cp-nav__es">Tickets</span>
            <span className="cp-nav__en">Issues</span>
          </NavLink>

          <NavLink
            to="/portal/invoices"
            className={({ isActive }) =>
              'cp-nav__item' + (isActive ? ' cp-nav__item--active' : '')
            }
          >
            <span className="cp-nav__es">Facturas</span>
            <span className="cp-nav__en">Invoices</span>
          </NavLink>

          <NavLink
            to="/portal/account"
            className={({ isActive }) =>
              'cp-nav__item' + (isActive ? ' cp-nav__item--active' : '')
            }
          >
            <span className="cp-nav__es">Mi cuenta</span>
            <span className="cp-nav__en">Account</span>
          </NavLink>

          <NavLink
            to="/portal/request"
            className={({ isActive }) =>
              'cp-nav__item cp-nav__item--cta' +
              (isActive ? ' cp-nav__item--active' : '')
            }
          >
            <span className="cp-nav__es">+ Nueva solicitud</span>
            <span className="cp-nav__en">New request</span>
          </NavLink>
        </nav>

        <div className="cp-topbar__right">
          <button
            type="button"
            className="cp-topbar__logout"
            onClick={handleLogout}
            disabled={logout.isPending}
          >
            {logout.isPending ? '…' : 'Salir · Logout'}
          </button>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────── */}
      <main className="cp-body">
        <Outlet />
      </main>
    </div>
  );
}
