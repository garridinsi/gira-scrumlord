// SPDX-License-Identifier: GPL-3.0-or-later
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectSummaryPage } from './pages/ProjectSummaryPage';
import { BoardPage } from './pages/BoardPage';
import { BacklogPage } from './pages/BacklogPage';
import { SprintsPage } from './pages/SprintsPage';
import { IssueDetailPage } from './pages/IssueDetailPage';

export function App() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Protected app routes */}
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:key" element={<ProjectSummaryPage />} />
        <Route path="/projects/:key/board" element={<BoardPage />} />
        <Route path="/projects/:key/backlog" element={<BacklogPage />} />
        <Route path="/projects/:key/sprints" element={<SprintsPage />} />
        <Route path="/issues/:key" element={<IssueDetailPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
