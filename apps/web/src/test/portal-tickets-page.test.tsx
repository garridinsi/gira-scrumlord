// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IssueView } from '@gira/shared';
import { renderWithProviders } from './render';

const { list } = vi.hoisted(() => ({ list: vi.fn() }));
// The page imports '../../api/client'; both resolve to src/api/client, so this mock applies.
vi.mock('../api/client', () => ({ issues: { list: () => list() } }));

import { PortalTicketsPage } from '../pages/portal/PortalTicketsPage';

const issue = (over: Partial<IssueView>): IssueView =>
  ({
    id: over.key,
    key: 'X-1',
    title: 'Ticket',
    statusCategory: 'todo',
    projectKey: 'ALFA',
    type: 'task',
    priority: 'medium',
    labels: [],
    assignee: null,
    billingMode: 'hourly',
    loggedMinutes: 0,
    ...over,
  }) as unknown as IssueView;

describe('PortalTicketsPage', () => {
  beforeEach(() => list.mockReset());

  it('groups issues by status category', async () => {
    list.mockResolvedValue([
      issue({ key: 'ALFA-1', title: 'Open one', statusCategory: 'todo' }),
      issue({ key: 'ALFA-2', title: 'Doing one', statusCategory: 'in_progress' }),
      issue({ key: 'ALFA-3', title: 'Done one', statusCategory: 'done' }),
    ]);
    renderWithProviders(<PortalTicketsPage />);

    expect(await screen.findByText('Open one')).toBeInTheDocument();
    expect(screen.getByText('Doing one')).toBeInTheDocument();
    expect(screen.getByText('Done one')).toBeInTheDocument();
    // group headers
    expect(screen.getByText('En curso')).toBeInTheDocument();
    expect(screen.getByText('Abierto')).toBeInTheDocument();
    expect(screen.getByText('Hecho')).toBeInTheDocument();
  });

  it('shows the empty state when there are no issues', async () => {
    list.mockResolvedValue([]);
    renderWithProviders(<PortalTicketsPage />);
    expect(await screen.findByText(/No issues yet/i)).toBeInTheDocument();
  });

  it('filters by project when more than one project is present', async () => {
    list.mockResolvedValue([
      issue({ key: 'ALFA-1', title: 'Alfa ticket', projectKey: 'ALFA' }),
      issue({ key: 'BETA-1', title: 'Beta ticket', projectKey: 'BETA' }),
    ]);
    renderWithProviders(<PortalTicketsPage />);
    expect(await screen.findByText('Alfa ticket')).toBeInTheDocument();
    expect(screen.getByText('Beta ticket')).toBeInTheDocument();

    // Click the BETA filter pill → only Beta's ticket remains.
    await userEvent.click(screen.getByRole('button', { name: /BETA \(1\)/ }));
    expect(screen.queryByText('Alfa ticket')).not.toBeInTheDocument();
    expect(screen.getByText('Beta ticket')).toBeInTheDocument();
  });
});
