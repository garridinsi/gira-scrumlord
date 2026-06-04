// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage top-up for src/pages/ProjectsPage.tsx — surgical cases for the branches the
// main projects-page.test.tsx leaves uncovered: the monthly arm of the create-success
// navigation, the create onError toast + the isError banner, the pending button label,
// and the list-query error state.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

const { list, create } = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn() }));
vi.mock('../api/client', () => ({
  projects: { list: () => list(), create: (d: unknown) => create(d) },
  // Real-shaped ApiError so `err instanceof ApiError` (source line 42) takes its
  // message arm when the create mutation rejects with an instance.
  ApiError: class ApiError extends Error {
    constructor(
      public readonly status: number,
      public readonly body: unknown,
      message: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

import { ProjectsPage } from '../pages/ProjectsPage';
import { ApiError } from '../api/client';

async function openCreateForm() {
  await userEvent.click(await screen.findByRole('button', { name: /\+ Proyecto/ }));
  await userEvent.type(screen.getByPlaceholderText('MTNR'), 'mnt'); // upper-cased on input
  await userEvent.type(screen.getByPlaceholderText('Nombre del proyecto'), 'Maintenance');
}

describe('ProjectsPage coverage top-up', () => {
  beforeEach(() => {
    list.mockReset().mockResolvedValue([]);
    create.mockReset();
  });

  // ── line 35: the monthly arm of the success navigation ─────────────────────────
  it('submits a monthly project and navigates via the monthly destination arm', async () => {
    create.mockResolvedValue({ key: 'MNT', name: 'Maintenance', cadence: 'monthly' });
    renderWithProviders(<ProjectsPage />);

    await openCreateForm();
    // Flip the cadence toggle to monthly so the created payload carries cadence: 'monthly'.
    await userEvent.click(screen.getByRole('button', { name: /Mensual · Monthly/ }));
    await userEvent.click(screen.getByRole('button', { name: /\+ Crear/ }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]![0]).toMatchObject({
      key: 'MNT',
      name: 'Maintenance',
      cadence: 'monthly',
    });
    // onSuccess closed the form (onDone) and navigated — the create form is gone, so the
    // "+ Proyecto" trigger is back on screen.
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('Nombre del proyecto')).not.toBeInTheDocument(),
    );
    expect(await screen.findByRole('button', { name: /\+ Proyecto/ })).toBeInTheDocument();
  });

  // ── lines 39-44 + 167-173: onError toast (ApiError arm) and the isError banner ──
  it('shows the inline error banner when create rejects with an ApiError', async () => {
    create.mockRejectedValue(new ApiError(409, null, 'clave duplicada'));
    renderWithProviders(<ProjectsPage />);

    await openCreateForm();
    await userEvent.click(screen.getByRole('button', { name: /\+ Crear/ }));

    // mut.isError → the banner renders "Error: <message>" (source lines 167-173); the
    // onError toast ran the ApiError message arm (toast itself is a no-op context).
    expect(await screen.findByText(/Error: clave duplicada/)).toBeInTheDocument();
  });

  // ── line 163: the pending button label ─────────────────────────────────────────
  it('shows the "Creando…" label while the create mutation is pending', async () => {
    // A never-resolving promise keeps the mutation in its pending state.
    create.mockReturnValue(new Promise<never>(() => {}));
    renderWithProviders(<ProjectsPage />);

    await openCreateForm();
    await userEvent.click(screen.getByRole('button', { name: /\+ Crear/ }));

    expect(await screen.findByRole('button', { name: /Creando/ })).toBeInTheDocument();
  });

  // ── lines 205-210: the list-query error state ──────────────────────────────────
  it('renders the failed-to-load state when the projects query rejects', async () => {
    list.mockReset().mockRejectedValue(new Error('boom'));
    renderWithProviders(<ProjectsPage />);

    expect(await screen.findByText(/error al cargar · failed to load/)).toBeInTheDocument();
  });
});
