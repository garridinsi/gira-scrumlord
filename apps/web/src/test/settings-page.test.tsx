// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './render';

const m = vi.hoisted(() => ({
  clientsList: vi.fn(),
  ratesList: vi.fn(),
  channelsList: vi.fn(),
  intakeSourcesList: vi.fn(),
  intakeRulesList: vi.fn(),
  usersList: vi.fn(),
  projectsList: vi.fn(),
  labelsList: vi.fn(),
}));
vi.mock('../api/client', () => ({
  clients: { list: () => m.clientsList(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  rates: { list: () => m.ratesList(), upsert: vi.fn(), delete: vi.fn() },
  channels: { list: () => m.channelsList(), create: vi.fn(), delete: vi.fn(), test: vi.fn() },
  intake: {
    sources: { list: () => m.intakeSourcesList(), create: vi.fn(), delete: vi.fn() },
    rules: { list: () => m.intakeRulesList(), create: vi.fn(), delete: vi.fn() },
  },
  projects: { list: () => m.projectsList(), labels: { list: () => m.labelsList() } },
  users: { list: () => m.usersList(), create: vi.fn(), update: vi.fn(), invite: vi.fn() },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: { role: 'admin' } }) }));

import { SettingsPage } from '../pages/SettingsPage';

const renderTab = (tab?: string) =>
  renderWithProviders(<SettingsPage />, { route: tab ? `/settings?tab=${tab}` : '/settings' });

describe('SettingsPage', () => {
  beforeEach(() => {
    m.clientsList.mockReset().mockResolvedValue([]);
    m.ratesList.mockReset().mockResolvedValue([]);
    m.channelsList.mockReset().mockResolvedValue([]);
    m.intakeSourcesList.mockReset().mockResolvedValue([]);
    m.intakeRulesList.mockReset().mockResolvedValue([]);
    m.usersList.mockReset().mockResolvedValue([]);
    m.projectsList.mockReset().mockResolvedValue([]);
    m.labelsList.mockReset().mockResolvedValue([]);
  });

  // Each render exercises that tab's section (rate form w/ scope dropdown, channels,
  // intake sources/rules, team) — the 2.2k-line admin surface. A clean render of the
  // section (tab bar present, no crash) is the assertion.
  it('renders the Clients tab by default', async () => {
    renderTab();
    expect(await screen.findByText('Clientes')).toBeInTheDocument();
  });

  it('renders the Rates tab (rate form + scope dropdown)', async () => {
    renderTab('rates');
    expect(await screen.findByText('Tarifas')).toBeInTheDocument();
  });

  it('renders the Channels tab', async () => {
    renderTab('channels');
    expect(await screen.findByText('Avisos')).toBeInTheDocument();
  });

  it('renders the Intake tab', async () => {
    renderTab('intake');
    expect(await screen.findByText('Integraciones')).toBeInTheDocument();
  });

  it('renders the Team tab', async () => {
    renderTab('team');
    expect(await screen.findByText('Equipo')).toBeInTheDocument();
  });
});
