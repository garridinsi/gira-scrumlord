// SPDX-License-Identifier: GPL-3.0-or-later
// App.tsx is purely the route table — no guards or data of its own (those live in the
// two layouts). So we stub every page + both layouts and assert that each path in the
// table resolves to the page it should, that the staff index redirects to /projects, and
// that the catch-all bounces unknown paths back to the index redirect.
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './render';

// Helpers must live in vi.hoisted so they exist when the (hoisted) vi.mock factories run.
const { page, layout } = vi.hoisted(() => {
  // A page stub renders an identifiable sentinel string (React 18 allows a component to
  // return a bare string — no JSX, so the hoisted factory never touches `document`).
  const page = (label: string) => () => label;
  // A layout stub renders the routed <Outlet/> via createElement (not JSX) so nested
  // routes still resolve. We don't exercise the layout guards here — those have their own
  // tests; App only wires the route tree.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createElement } = require('react');
  const { Outlet } = require('react-router-dom');
  const layout = () => createElement(Outlet, null);
  return { page, layout };
});

vi.mock('../components/layout/AppLayout', () => ({ AppLayout: layout }));
vi.mock('../components/layout/ClientPortalLayout', () => ({ ClientPortalLayout: layout }));

vi.mock('../pages/LoginPage', () => ({ LoginPage: page('login-page') }));
vi.mock('../pages/AuthCallbackPage', () => ({ AuthCallbackPage: page('auth-callback-page') }));
vi.mock('../pages/EmailChangeConfirmPage', () => ({
  EmailChangeConfirmPage: page('email-change-confirm-page'),
}));
vi.mock('../pages/AccountPage', () => ({ AccountPage: page('account-page') }));
vi.mock('../pages/ProjectsPage', () => ({ ProjectsPage: page('projects-page') }));
vi.mock('../pages/ProjectSummaryPage', () => ({
  ProjectSummaryPage: page('project-summary-page'),
}));
vi.mock('../pages/BoardPage', () => ({ BoardPage: page('board-page') }));
vi.mock('../pages/BacklogPage', () => ({ BacklogPage: page('backlog-page') }));
vi.mock('../pages/SprintsPage', () => ({ SprintsPage: page('sprints-page') }));
vi.mock('../pages/MonthlyPage', () => ({ MonthlyPage: page('monthly-page') }));
vi.mock('../pages/IssueDetailPage', () => ({ IssueDetailPage: page('issue-detail-page') }));
vi.mock('../pages/SauronPage', () => ({ SauronPage: page('sauron-page') }));
vi.mock('../pages/IncidentsPage', () => ({ IncidentsPage: page('incidents-page') }));
vi.mock('../pages/BillingPage', () => ({ BillingPage: page('billing-page') }));
vi.mock('../pages/InvoiceDetailPage', () => ({ InvoiceDetailPage: page('invoice-detail-page') }));
vi.mock('../pages/SettingsPage', () => ({ SettingsPage: page('settings-page') }));
vi.mock('../pages/portal/PortalOverviewPage', () => ({
  PortalOverviewPage: page('portal-overview-page'),
}));
vi.mock('../pages/portal/PortalTicketsPage', () => ({
  PortalTicketsPage: page('portal-tickets-page'),
}));
vi.mock('../pages/portal/PortalIssueDetailPage', () => ({
  PortalIssueDetailPage: page('portal-issue-detail-page'),
}));
vi.mock('../pages/portal/PortalInvoicesPage', () => ({
  PortalInvoicesPage: page('portal-invoices-page'),
}));
vi.mock('../pages/portal/PortalInvoiceDetailPage', () => ({
  PortalInvoiceDetailPage: page('portal-invoice-detail-page'),
}));
vi.mock('../pages/portal/PortalRequestPage', () => ({
  PortalRequestPage: page('portal-request-page'),
}));

import { App } from '../App';

const at = (route: string) => renderWithProviders(<App />, { route });

describe('App route table', () => {
  describe('public auth routes', () => {
    it('renders the login page at /login', () => {
      at('/login');
      expect(screen.getByText('login-page')).toBeInTheDocument();
    });

    it('renders the auth callback page at /auth/callback', () => {
      at('/auth/callback?token=abc');
      expect(screen.getByText('auth-callback-page')).toBeInTheDocument();
    });

    it('renders the email-change confirm page at /account/confirm-email', () => {
      at('/account/confirm-email?token=abc');
      expect(screen.getByText('email-change-confirm-page')).toBeInTheDocument();
    });
  });

  describe('client portal routes (under ClientPortalLayout)', () => {
    it('renders the overview at /portal', () => {
      at('/portal');
      expect(screen.getByText('portal-overview-page')).toBeInTheDocument();
    });

    it('renders the tickets list at /portal/issues', () => {
      at('/portal/issues');
      expect(screen.getByText('portal-tickets-page')).toBeInTheDocument();
    });

    it('renders an issue detail at /portal/issues/:key', () => {
      at('/portal/issues/GIRA-1');
      expect(screen.getByText('portal-issue-detail-page')).toBeInTheDocument();
    });

    it('renders the invoices list at /portal/invoices', () => {
      at('/portal/invoices');
      expect(screen.getByText('portal-invoices-page')).toBeInTheDocument();
    });

    it('renders an invoice detail at /portal/invoices/:id', () => {
      at('/portal/invoices/inv_1');
      expect(screen.getByText('portal-invoice-detail-page')).toBeInTheDocument();
    });

    it('renders the request page at /portal/request', () => {
      at('/portal/request');
      expect(screen.getByText('portal-request-page')).toBeInTheDocument();
    });

    it('renders the account page at /portal/account', () => {
      at('/portal/account');
      expect(screen.getByText('account-page')).toBeInTheDocument();
    });
  });

  describe('staff app routes (under AppLayout)', () => {
    it('redirects the index / to /projects', () => {
      at('/');
      expect(screen.getByText('projects-page')).toBeInTheDocument();
    });

    it('renders the projects list at /projects', () => {
      at('/projects');
      expect(screen.getByText('projects-page')).toBeInTheDocument();
    });

    it('renders the project summary at /projects/:key', () => {
      at('/projects/GIRA');
      expect(screen.getByText('project-summary-page')).toBeInTheDocument();
    });

    it('renders the board at /projects/:key/board', () => {
      at('/projects/GIRA/board');
      expect(screen.getByText('board-page')).toBeInTheDocument();
    });

    it('renders the backlog at /projects/:key/backlog', () => {
      at('/projects/GIRA/backlog');
      expect(screen.getByText('backlog-page')).toBeInTheDocument();
    });

    it('renders the sprints page at /projects/:key/sprints', () => {
      at('/projects/GIRA/sprints');
      expect(screen.getByText('sprints-page')).toBeInTheDocument();
    });

    it('renders the monthly page at /projects/:key/monthly', () => {
      at('/projects/GIRA/monthly');
      expect(screen.getByText('monthly-page')).toBeInTheDocument();
    });

    it('renders an issue detail at /issues/:key', () => {
      at('/issues/GIRA-7');
      expect(screen.getByText('issue-detail-page')).toBeInTheDocument();
    });

    it('renders the audit (Sauron) page at /audit', () => {
      at('/audit');
      expect(screen.getByText('sauron-page')).toBeInTheDocument();
    });

    it('renders the incidents page at /incidents', () => {
      at('/incidents');
      expect(screen.getByText('incidents-page')).toBeInTheDocument();
    });

    it('renders the billing page at /billing', () => {
      at('/billing');
      expect(screen.getByText('billing-page')).toBeInTheDocument();
    });

    it('renders an invoice detail at /invoices/:id', () => {
      at('/invoices/inv_42');
      expect(screen.getByText('invoice-detail-page')).toBeInTheDocument();
    });

    it('renders the settings page at /settings', () => {
      at('/settings');
      expect(screen.getByText('settings-page')).toBeInTheDocument();
    });

    it('renders the account page at /account', () => {
      at('/account');
      expect(screen.getByText('account-page')).toBeInTheDocument();
    });
  });

  describe('catch-all', () => {
    it('redirects an unknown path back to the index (which redirects to /projects)', () => {
      at('/this/does/not/exist');
      expect(screen.getByText('projects-page')).toBeInTheDocument();
    });
  });
});
