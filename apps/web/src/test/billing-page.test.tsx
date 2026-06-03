// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './render';

const { clientsList, listForClient, generate } = vi.hoisted(() => ({
  clientsList: vi.fn(),
  listForClient: vi.fn(),
  generate: vi.fn(),
}));
vi.mock('../api/client', () => ({
  clients: { list: () => clientsList() },
  invoices: { listForClient: (id: string) => listForClient(id), generate: (c: string, b: unknown) => generate(c, b) },
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: { role: 'admin' } }) }));

import { BillingPage } from '../pages/BillingPage';

describe('BillingPage', () => {
  beforeEach(() => {
    clientsList.mockReset();
    listForClient.mockReset();
    generate.mockReset();
  });

  it('renders the client selector with the loaded clients', async () => {
    clientsList.mockResolvedValue([
      { id: 'c1', name: 'Acme Corp', slug: 'acme', currency: 'EUR' },
      { id: 'c2', name: 'Beta Inc', slug: 'beta', currency: 'EUR' },
    ]);
    renderWithProviders(<BillingPage />);
    // Clients render as <option>{name} ({currency})</option> in the selector.
    expect(await screen.findByRole('option', { name: /Acme Corp/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Beta Inc/ })).toBeInTheDocument();
  });
});
