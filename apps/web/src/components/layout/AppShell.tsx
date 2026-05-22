// SPDX-License-Identifier: GPL-3.0-or-later
import { Outlet, Navigate } from 'react-router-dom';
import { useMe } from '../../hooks/useAuth';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { FullPageSpinner } from '../ui/Spinner';
import { ApiError } from '../../api/client';

export function AppShell() {
  const { data: me, isLoading, error } = useMe();

  if (isLoading) return <FullPageSpinner />;

  // 401 = not logged in → redirect to login
  if (error instanceof ApiError && error.status === 401) {
    return <Navigate to="/login" replace />;
  }

  // Other errors: still try to show the app, error boundary will catch it
  if (!me) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
