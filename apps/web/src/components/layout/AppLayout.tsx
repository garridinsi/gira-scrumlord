// SPDX-License-Identifier: GPL-3.0-or-later
import { Navigate, Outlet } from 'react-router-dom';
import { useMe } from '../../hooks/useAuth';
import { Rail } from './Rail';
import { TopBar } from './TopBar';

export function AppLayout() {
  const me = useMe();

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

  return (
    <div className="app">
      <TopBar />
      <div className="main">
        <Rail />
        <Outlet />
      </div>
    </div>
  );
}
