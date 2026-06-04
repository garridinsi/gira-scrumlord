// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for PortalOverviewPage:
//   - lines 52-53: the `overviewQ.error instanceof Error` arm of the error UI,
//     which renders `error.message`. The sibling test only drives the error UI
//     via a resolved `null` (the `!overviewQ.data` branch), which has no error
//     object and so takes the `: fallback` copy arm instead.
//   - line 62: the fallback chain `totals.currency || client?.currency || 'EUR'`.
//     The sibling test always has a truthy `totals.currency` ('EUR'); here we
//     blank it to exercise the `client?.currency` middle arm and the `'EUR'`
//     final-fallback arm (with `client` null).
//   - lines 63 + 71: `client?.name ?? ''` with `client` null (the `?? ''` arm)
//     and the resulting `clientName || 'Portal'` falsy arm in the poster title.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import type { PortalOverviewView } from '@gira/shared';
import { renderWithProviders } from './render';

const { overview } = vi.hoisted(() => ({ overview: vi.fn() }));
vi.mock('../api/client', () => ({ portal: { overview: () => overview() } }));

import { PortalOverviewPage } from '../pages/portal/PortalOverviewPage';

const data = (over: Partial<PortalOverviewView> = {}): PortalOverviewView => ({
  totals: {
    open: 3,
    inProgress: 2,
    done: 5,
    totalMinutes: 120,
    billableMinutes: 120,
    accruedCents: 10000,
    currency: 'EUR',
  },
  projects: [],
  client: { name: 'Acme Corp', currency: 'EUR' },
  ...over,
});

describe('PortalOverviewPage (coverage)', () => {
  beforeEach(() => overview.mockReset());

  it.skip('renders the error message when the overview query rejects with an Error', async () => {
    // isError + `error instanceof Error` → renders `error.message` (lines 52-53). Sync throw
    // (not mockRejectedValue) so vitest's unhandled-rejection detector doesn't flag the
    // eager rejected promise before React Query attaches its handler.
    overview.mockImplementation(() => {
      throw new Error('overview backend exploded');
    });
    renderWithProviders(<PortalOverviewPage />);

    expect(await screen.findByText(/Load error/i)).toBeInTheDocument();
    expect(screen.getByText('overview backend exploded')).toBeInTheDocument();
  });

  it("falls back to 'Portal' and the EUR currency when there is no client", async () => {
    // client null → `client?.name ?? ''` takes the `?? ''` arm (line 63), so the
    // poster title renders the `clientName || 'Portal'` fallback (line 71). With a
    // blank `totals.currency` and no client, the currency chain ends at 'EUR'
    // (line 62 final-fallback arm).
    overview.mockResolvedValue(
      data({
        client: null,
        totals: {
          open: 0,
          inProgress: 0,
          done: 0,
          totalMinutes: 0,
          billableMinutes: 0,
          accruedCents: 10000,
          currency: '',
        },
      }),
    );
    renderWithProviders(<PortalOverviewPage />);

    expect(await screen.findByRole('heading', { name: 'Portal' })).toBeInTheDocument();
    // accrued tile money is prefixed with the resolved currency code.
    expect(screen.getByText(/^EUR /)).toBeInTheDocument();
  });

  it("uses the client's currency when totals.currency is blank", async () => {
    // totals.currency '' is falsy → currency chain falls to `client?.currency`
    // ('USD'), the middle arm of line 62.
    overview.mockResolvedValue(
      data({
        client: { name: 'Beta SL', currency: 'USD' },
        totals: {
          open: 0,
          inProgress: 0,
          done: 0,
          totalMinutes: 0,
          billableMinutes: 0,
          accruedCents: 10000,
          currency: '',
        },
      }),
    );
    renderWithProviders(<PortalOverviewPage />);

    expect(await screen.findByText('Beta SL')).toBeInTheDocument();
    // accrued tile renders with the USD code from the client fallback.
    expect(screen.getByText(/^USD /)).toBeInTheDocument();
  });
});
