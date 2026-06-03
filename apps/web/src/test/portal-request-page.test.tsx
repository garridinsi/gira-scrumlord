// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

const { overview, createRequest } = vi.hoisted(() => ({ overview: vi.fn(), createRequest: vi.fn() }));
vi.mock('../api/client', () => ({
  portal: { overview: () => overview(), createRequest: (d: unknown) => createRequest(d) },
}));

import { PortalRequestPage } from '../pages/portal/PortalRequestPage';

const overviewWith = (projects: Array<{ key: string; name: string }>) => ({
  projects: projects.map((p) => ({ ...p, open: 0, inProgress: 0, done: 0, totalMinutes: 0, accruedCents: 0 })),
  totals: { open: 0, inProgress: 0, done: 0, totalMinutes: 0, accruedCents: 0, currency: 'EUR' },
  client: { name: 'Acme', currency: 'EUR' },
});

describe('PortalRequestPage', () => {
  beforeEach(() => {
    overview.mockReset();
    createRequest.mockReset();
  });

  it('auto-selects the only project and submits a bug request', async () => {
    overview.mockResolvedValue(overviewWith([{ key: 'ALFA', name: 'Alfa' }]));
    createRequest.mockResolvedValue({ key: 'ALFA-5', title: 'It broke' });
    renderWithProviders(<PortalRequestPage />);

    expect(await screen.findByText('ALFA')).toBeInTheDocument(); // single-project indicator
    await userEvent.type(screen.getByLabelText(/Title/i), 'It broke');
    await userEvent.click(screen.getByRole('button', { name: /Submit request/ }));

    await waitFor(() => expect(createRequest).toHaveBeenCalledTimes(1));
    expect(createRequest.mock.calls[0]![0]).toMatchObject({ projectKey: 'ALFA', title: 'It broke', type: 'bug' });
  });

  it('lets you pick a project and switch the type to task when several exist', async () => {
    overview.mockResolvedValue(overviewWith([{ key: 'ALFA', name: 'Alfa' }, { key: 'BETA', name: 'Beta' }]));
    createRequest.mockResolvedValue({ key: 'BETA-1', title: 'Need this' });
    renderWithProviders(<PortalRequestPage />);

    await userEvent.selectOptions(await screen.findByLabelText(/Project/i), 'BETA');
    await userEvent.click(screen.getByRole('button', { name: /Tarea · Task/ }));
    await userEvent.type(screen.getByLabelText(/Title/i), 'Need this');
    await userEvent.click(screen.getByRole('button', { name: /Submit request/ }));

    await waitFor(() => expect(createRequest).toHaveBeenCalledTimes(1));
    expect(createRequest.mock.calls[0]![0]).toMatchObject({ projectKey: 'BETA', title: 'Need this', type: 'task' });
  });
});
