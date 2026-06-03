// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IncidentView } from '@gira/shared';
import { renderWithProviders } from './render';

const { list, ack, resolve } = vi.hoisted(() => ({ list: vi.fn(), ack: vi.fn(), resolve: vi.fn() }));
vi.mock('../api/client', () => ({
  incidents: { list: (f?: string) => list(f), ack: (id: string) => ack(id), resolve: (id: string) => resolve(id) },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: { role: 'admin' } }) }));

import { IncidentsPage } from '../pages/IncidentsPage';

const incident = (over: Partial<IncidentView>): IncidentView =>
  ({
    id: 'inc1',
    issueKey: 'GIRA-1',
    title: 'PROD DOWN',
    status: 'open',
    escalationLevel: 1,
    createdAt: '2026-06-01T00:00:00Z',
    lastNotifiedAt: null,
    ...over,
  }) as unknown as IncidentView;

describe('IncidentsPage', () => {
  beforeEach(() => {
    list.mockReset();
    ack.mockReset();
    resolve.mockReset();
  });

  it('renders incident rows and the open-count headline', async () => {
    list.mockResolvedValue([
      incident({ id: 'inc1', issueKey: 'GIRA-1', title: 'PROD DOWN', status: 'open', escalationLevel: 2 }),
      incident({ id: 'inc2', issueKey: 'GIRA-2', title: 'Recovered', status: 'resolved' }),
    ]);
    renderWithProviders(<IncidentsPage />);
    expect(await screen.findByText('GIRA-1')).toBeInTheDocument();
    expect(screen.getByText('PROD DOWN')).toBeInTheDocument();
    expect(screen.getByText('Recovered')).toBeInTheDocument();
    expect(screen.getByText('1 ABIERTAS')).toBeInTheDocument(); // one open
  });

  it('acknowledges an open incident', async () => {
    list.mockResolvedValue([incident({ id: 'inc1', status: 'open' })]);
    ack.mockResolvedValue({});
    renderWithProviders(<IncidentsPage />);
    await screen.findByText('GIRA-1');
    await userEvent.click(screen.getByRole('button', { name: /Reconocer · Ack/ }));
    await waitFor(() => expect(ack).toHaveBeenCalledWith('inc1'));
  });

  it('shows the all-clear empty state', async () => {
    list.mockResolvedValue([]);
    renderWithProviders(<IncidentsPage />);
    expect(await screen.findByText(/no incidents/i)).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });
});
