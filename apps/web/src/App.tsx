// SPDX-License-Identifier: GPL-3.0-or-later
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ClientPortalLayout } from './components/layout/ClientPortalLayout';
import { AccountPage } from './pages/AccountPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { BacklogPage } from './pages/BacklogPage';
import { EmailChangeConfirmPage } from './pages/EmailChangeConfirmPage';
import { BillingPage } from './pages/BillingPage';
import { BoardPage } from './pages/BoardPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { LoginPage } from './pages/LoginPage';
import { ProjectSummaryPage } from './pages/ProjectSummaryPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SauronPage } from './pages/SauronPage';
import { SettingsPage } from './pages/SettingsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { MonthlyPage } from './pages/MonthlyPage';
import { SprintsPage } from './pages/SprintsPage';
import { PortalOverviewPage } from './pages/portal/PortalOverviewPage';
import { PortalTicketsPage } from './pages/portal/PortalTicketsPage';
import { PortalIssueDetailPage } from './pages/portal/PortalIssueDetailPage';
import { PortalInvoicesPage } from './pages/portal/PortalInvoicesPage';
import { PortalInvoiceDetailPage } from './pages/portal/PortalInvoiceDetailPage';
import { PortalRequestPage } from './pages/portal/PortalRequestPage';

export function App() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      {/* Confirm a verified email change (link is emailed to the new address). */}
      <Route path="/account/confirm-email" element={<EmailChangeConfirmPage />} />

      {/* Client portal routes (auth-guarded, client-only chrome) */}
      <Route element={<ClientPortalLayout />}>
        <Route path="/portal" element={<PortalOverviewPage />} />
        <Route path="/portal/issues" element={<PortalTicketsPage />} />
        <Route path="/portal/issues/:key" element={<PortalIssueDetailPage />} />
        <Route path="/portal/invoices" element={<PortalInvoicesPage />} />
        <Route path="/portal/invoices/:id" element={<PortalInvoiceDetailPage />} />
        <Route path="/portal/request" element={<PortalRequestPage />} />
        <Route path="/portal/account" element={<AccountPage />} />
      </Route>

      {/* Staff app routes (auth-guarded shell — redirects client users to portal) */}
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:key" element={<ProjectSummaryPage />} />
        <Route path="/projects/:key/board" element={<BoardPage />} />
        <Route path="/projects/:key/backlog" element={<BacklogPage />} />
        <Route path="/projects/:key/sprints" element={<SprintsPage />} />
        <Route path="/projects/:key/monthly" element={<MonthlyPage />} />
        <Route path="/issues/:key" element={<IssueDetailPage />} />
        <Route path="/audit" element={<SauronPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
