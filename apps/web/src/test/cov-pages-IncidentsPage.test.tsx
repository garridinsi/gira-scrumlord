// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage closer for IncidentsPage: drives the ack/resolve mutation success +
// error toast branches (ApiError vs plain), the EscalationBadge level=2/>=3
// colours, the odd/even non-open row background ternary, the lastNotifiedAt
// present branch, the member-role canWrite branch, the 'all' filter (undefined
// query arg), the pending button labels, and the query error state.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IncidentView } from '@gira/shared';
import { renderWithProviders } from './render';

const { list, ack, resolve, toast, role, FakeApiError } = vi.hoisted(() => ({
  list: vi.fn(),
  ack: vi.fn(),
  resolve: vi.fn(),
  toast: vi.fn(),
  role: { value: 'admin' as 'admin' | 'member' | 'viewer' | 'client' },
  // Defined in the hoisted block so both the mock factory (which runs hoisted)
  // and the test bodies share the exact same class identity for instanceof.
  FakeApiError: class FakeApiError extends Error {},
}));

vi.mock('../api/client', () => ({
  incidents: {
    list: (f?: string) => list(f),
    ack: (id: string) => ack(id),
    resolve: (id: string) => resolve(id),
  },
  ApiError: FakeApiError,
}));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: { role: role.value } }) }));
vi.mock('../ui/Toast', () => ({ useToast: () => toast }));

import { IncidentsPage } from '../pages/IncidentsPage';

const incident = (over: Partial<IncidentView>): IncidentView =>
  ({
    id: 'inc1',
    issueKey: 'GIRA-1',
    projectKey: 'GIRA',
    title: 'PROD DOWN',
    status: 'open',
    escalationLevel: 1,
    lastNotifiedAt: null,
    acknowledgedAt: null,
    createdAt: '2026-06-01T00:00:00Z',
    ...over,
  }) satisfies IncidentView;

describe('IncidentsPage — coverage', () => {
  beforeEach(() => {
    list.mockReset();
    ack.mockReset();
    resolve.mockReset();
    toast.mockReset();
    role.value = 'admin';
  });

  it('renders the escalation badges (level 2 and level >= 3) and the lastNotifiedAt cell', async () => {
    list.mockResolvedValue([
      incident({
        id: 'inc1',
        issueKey: 'GIRA-1',
        title: 'PROD DOWN',
        status: 'open',
        escalationLevel: 3, // level >= 3 → red, bold (line 63)
        lastNotifiedAt: '2026-06-01T00:30:00Z', // present → formatDate title + relative (lines 199, 201)
      }),
      incident({
        id: 'inc2',
        issueKey: 'GIRA-2',
        title: 'Degraded',
        status: 'acked',
        escalationLevel: 2, // level === 2 → yellow, bold (line 63)
      }),
    ]);
    renderWithProviders(<IncidentsPage />);

    expect(await screen.findByText('GIRA-1')).toBeInTheDocument();
    // EscalationBadge bilingual text for both levels.
    expect(screen.getByText('Nivel 3 · Level 3')).toBeInTheDocument();
    expect(screen.getByText('Nivel 2 · Level 2')).toBeInTheDocument();
    // lastNotifiedAt present → the relative-time string renders (not the em dash).
    // There is exactly one row with a lastNotifiedAt set; the other shows '—'.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('alternates row backgrounds for non-open incidents (odd/even ternary)', async () => {
    list.mockResolvedValue([
      // i === 0 (even) and i === 1 (odd), both resolved so neither hits the
      // open-row red background → exercises the i % 2 ? paper : paper-2 ternary.
      incident({ id: 'inc1', issueKey: 'GIRA-1', title: 'First', status: 'resolved' }),
      incident({ id: 'inc2', issueKey: 'GIRA-2', title: 'Second', status: 'resolved' }),
    ]);
    renderWithProviders(<IncidentsPage />);

    expect(await screen.findByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    // No open incidents → all-clear headline.
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('acknowledges an open incident and toasts on success', async () => {
    list.mockResolvedValue([incident({ id: 'inc1', status: 'open' })]);
    ack.mockResolvedValue({});
    renderWithProviders(<IncidentsPage />);

    await screen.findByText('GIRA-1');
    await userEvent.click(screen.getByRole('button', { name: /Reconocer · Ack/ }));

    await waitFor(() => expect(ack).toHaveBeenCalledWith('inc1'));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Reconocida · Acknowledged' }),
      ),
    );
  });

  it('toasts the ApiError message when ack fails', async () => {
    list.mockResolvedValue([incident({ id: 'inc1', status: 'open' })]);
    ack.mockRejectedValue(new FakeApiError('paged, not acked'));
    renderWithProviders(<IncidentsPage />);

    await screen.findByText('GIRA-1');
    await userEvent.click(screen.getByRole('button', { name: /Reconocer · Ack/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al reconocer · Ack failed',
          body: 'paged, not acked', // err instanceof ApiError → err.message
        }),
      ),
    );
  });

  it('toasts a generic body when ack fails with a non-ApiError', async () => {
    list.mockResolvedValue([incident({ id: 'inc1', status: 'open' })]);
    ack.mockRejectedValue(new Error('network'));
    renderWithProviders(<IncidentsPage />);

    await screen.findByText('GIRA-1');
    await userEvent.click(screen.getByRole('button', { name: /Reconocer · Ack/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al reconocer · Ack failed',
          body: 'Error', // not ApiError → fallback string
        }),
      ),
    );
  });

  it('shows the pending ack label while the mutation is in flight', async () => {
    list.mockResolvedValue([incident({ id: 'inc1', status: 'open' })]);
    // A promise that never settles keeps ackMut.isPending true → '...' label (line 214).
    ack.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<IncidentsPage />);

    await screen.findByText('GIRA-1');
    await userEvent.click(screen.getByRole('button', { name: /Reconocer · Ack/ }));

    // Both buttons go disabled (isBusy) and the ack button shows the spinner label.
    expect(await screen.findByRole('button', { name: '...' })).toBeInTheDocument();
  });

  it('shows the pending resolve label while the mutation is in flight', async () => {
    list.mockResolvedValue([incident({ id: 'inc1', status: 'acked' })]);
    // Never-settling promise keeps resolveMut.isPending true → '...' label (line 225).
    resolve.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<IncidentsPage />);

    await screen.findByText('GIRA-1');
    await userEvent.click(screen.getByRole('button', { name: /Resolver · Resolve/ }));

    expect(await screen.findByRole('button', { name: '...' })).toBeInTheDocument();
  });

  it('resolves an acked incident and toasts on success', async () => {
    // status 'acked' → only the Resolve button is shown (no Ack button).
    list.mockResolvedValue([incident({ id: 'inc1', status: 'acked' })]);
    resolve.mockResolvedValue({});
    renderWithProviders(<IncidentsPage />);

    await screen.findByText('GIRA-1');
    await userEvent.click(screen.getByRole('button', { name: /Resolver · Resolve/ }));

    await waitFor(() => expect(resolve).toHaveBeenCalledWith('inc1'));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Resuelta · Resolved' }),
      ),
    );
  });

  it('toasts the ApiError message when resolve fails', async () => {
    list.mockResolvedValue([incident({ id: 'inc1', status: 'acked' })]);
    resolve.mockRejectedValue(new FakeApiError('still on fire'));
    renderWithProviders(<IncidentsPage />);

    await screen.findByText('GIRA-1');
    await userEvent.click(screen.getByRole('button', { name: /Resolver · Resolve/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al resolver · Resolve failed',
          body: 'still on fire',
        }),
      ),
    );
  });

  it('toasts a generic body when resolve fails with a non-ApiError', async () => {
    list.mockResolvedValue([incident({ id: 'inc1', status: 'acked' })]);
    resolve.mockRejectedValue(new Error('boom'));
    renderWithProviders(<IncidentsPage />);

    await screen.findByText('GIRA-1');
    await userEvent.click(screen.getByRole('button', { name: /Resolver · Resolve/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al resolver · Resolve failed',
          body: 'Error',
        }),
      ),
    );
  });

  it('lets a member write (canWrite member branch) and shows the action buttons', async () => {
    role.value = 'member';
    list.mockResolvedValue([incident({ id: 'inc1', status: 'open' })]);
    renderWithProviders(<IncidentsPage />);

    await screen.findByText('GIRA-1');
    // canWrite true via role === 'member' (line 239) → both buttons render.
    expect(screen.getByRole('button', { name: /Reconocer · Ack/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resolver · Resolve/ })).toBeInTheDocument();
  });

  it('hides action buttons for a read-only role', async () => {
    role.value = 'viewer';
    list.mockResolvedValue([incident({ id: 'inc1', status: 'open' })]);
    renderWithProviders(<IncidentsPage />);

    await screen.findByText('GIRA-1');
    expect(screen.queryByRole('button', { name: /Reconocer · Ack/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Resolver · Resolve/ })).not.toBeInTheDocument();
  });

  it("queries with an undefined arg when the 'all' filter is selected", async () => {
    list.mockResolvedValue([]);
    renderWithProviders(<IncidentsPage />);

    // First load uses the default 'open' filter.
    await waitFor(() => expect(list).toHaveBeenCalledWith('open'));

    // Click the "Todas · All" pill → statusFilter 'all' → queryArg undefined (line 241).
    // The Subbar tab's EN half is aria-hidden, so only the filter pill carries the
    // full "Todas · All" accessible name → a single match.
    await userEvent.click(screen.getByRole('button', { name: 'Todas · All' }));

    await waitFor(() => expect(list).toHaveBeenCalledWith(undefined));
  });

  it('renders the error state when the incidents query rejects', async () => {
    list.mockRejectedValue(new Error('down'));
    renderWithProviders(<IncidentsPage />);

    // Error banner (lines 455-463).
    expect(await screen.findByText(/failed to load/)).toBeInTheDocument();
  });
});
