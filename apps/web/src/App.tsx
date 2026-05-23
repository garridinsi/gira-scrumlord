// SPDX-License-Identifier: GPL-3.0-or-later
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { BacklogPage } from './pages/BacklogPage';
import { BoardPage } from './pages/BoardPage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { LoginPage } from './pages/LoginPage';
import { ProjectSummaryPage } from './pages/ProjectSummaryPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SauronPage } from './pages/SauronPage';
import { SettingsPage } from './pages/SettingsPage';
import { SprintsPage } from './pages/SprintsPage';

export function App() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Protected app routes (auth-guarded shell) */}
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:key" element={<ProjectSummaryPage />} />
        <Route path="/projects/:key/board" element={<BoardPage />} />
        <Route path="/projects/:key/backlog" element={<BacklogPage />} />
        <Route path="/projects/:key/sprints" element={<SprintsPage />} />
        <Route path="/issues/:key" element={<IssueDetailPage />} />
        <Route path="/audit" element={<SauronPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
