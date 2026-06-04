// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-focused cases for the staff TopBar: the search-on-Enter path, the project
// picker (open + select), the avisos badge, and the account menu (open / account / logout).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

const { projectsList, incidentsList, logoutMutate, useMeFn } = vi.hoisted(() => ({
  projectsList: vi.fn(),
  incidentsList: vi.fn(),
  logoutMutate: vi.fn(),
  useMeFn: vi.fn(),
}));
vi.mock('../api/client', () => ({
  projects: { list: () => projectsList() },
  incidents: { list: (f?: string) => incidentsList(f) },
}));
vi.mock('../hooks/useAuth', () => ({
  useMe: () => useMeFn(),
  useLogout: () => ({ mutate: logoutMutate }),
}));
// Isolate from the bell's own data wiring (it has its own dedicated coverage).
vi.mock('../ui/NotificationBell', () => ({ NotificationBell: () => null }));

import { TopBar } from '../components/layout/TopBar';

// Render the TopBar under a real :key route so useParams() yields a project key and the
// key-gated branches (search, picker highlight) actually run.
function renderAtKey(key: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:key/board" element={<TopBar />} />
    </Routes>,
    { route: `/projects/${key}/board` },
  );
}

// The account toggle has no aria-label; its accessible name is its text content (the
// first name + chevron), so we locate it via aria-haspopup. It is the second such
// button in DOM order (the project picker is first).
function accountToggle(): HTMLElement {
  const haspopup = screen
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-haspopup') === 'menu');
  return haspopup[1]!;
}

describe('TopBar (coverage)', () => {
  beforeEach(() => {
    projectsList.mockReset().mockResolvedValue([]);
    incidentsList.mockReset().mockResolvedValue([]);
    logoutMutate.mockReset();
    useMeFn
      .mockReset()
      .mockReturnValue({ data: { id: 'u1', name: 'Ada Lovelace', role: 'admin' } });
  });

  it('falls back to the key as the project name when no project matches', async () => {
    // Loaded projects do not include MNT, so current is undefined → name shows the key.
    projectsList.mockResolvedValue([{ key: 'ALFA', name: 'Alfa' }]);
    renderAtKey('MNT');

    // Both the .pk chip and the projectname fall back to the key.
    await waitFor(() => expect(screen.getAllByText('MNT').length).toBeGreaterThanOrEqual(2));
  });

  it('runs a search on Enter, navigating to the backlog with the query', async () => {
    projectsList.mockResolvedValue([{ key: 'MNT', name: 'Mantenimiento' }]);
    renderAtKey('MNT');

    const input = screen.getByPlaceholderText(/Buscar/i);
    await userEvent.type(input, 'login bug{Enter}');

    // Navigated → the TopBar route no longer matches, so the search box is gone.
    await waitFor(() => expect(screen.queryByPlaceholderText(/Buscar/i)).not.toBeInTheDocument());
  });

  it('ignores Enter when the search box is empty (no navigation)', async () => {
    projectsList.mockResolvedValue([{ key: 'MNT', name: 'Mantenimiento' }]);
    renderAtKey('MNT');

    const input = screen.getByPlaceholderText(/Buscar/i);
    await userEvent.type(input, '   {Enter}');

    // Still on the TopBar route: the empty/whitespace term short-circuits runSearch.
    expect(screen.getByPlaceholderText(/Buscar/i)).toBeInTheDocument();
  });

  it('opens the project picker and navigates when a project is chosen', async () => {
    projectsList.mockResolvedValue([
      { key: 'MNT', name: 'Mantenimiento' },
      { key: 'BETA', name: 'Beta' },
    ]);
    renderAtKey('MNT');

    // The .pk chip already shows MNT; open the picker via the project button.
    const projectBtn = screen.getByRole('button', { expanded: false, name: /MNT/i });
    await userEvent.click(projectBtn);
    expect(projectBtn).toHaveAttribute('aria-expanded', 'true');

    // The picker lists both projects, the current one (MNT) highlighted.
    const betaItem = await screen.findByText('Beta');
    await userEvent.click(betaItem);

    // Selecting closes the menu (the dropdown's Beta entry is gone) and navigates to
    // /projects/BETA/board, which re-matches the route → the chip now reads BETA.
    await waitFor(() => expect(screen.getByText('BETA')).toBeInTheDocument());
    await waitFor(() => expect(projectBtn).toHaveAttribute('aria-expanded', 'false'));
  });

  it('shows the avisos badge when there are open incidents', async () => {
    incidentsList.mockResolvedValue([{ id: 'i1' }, { id: 'i2' }, { id: 'i3' }]);
    renderAtKey('MNT');

    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('renders the first name and the account menu, and logs out', async () => {
    // mutate(undefined, { onSuccess }) → fire onSuccess so the post-logout navigate runs.
    logoutMutate.mockImplementation((_v: unknown, opts?: { onSuccess?: () => void }) =>
      opts?.onSuccess?.(),
    );
    renderAtKey('MNT');

    // First name from "Ada Lovelace".
    expect(screen.getByText('Ada')).toBeInTheDocument();

    await userEvent.click(accountToggle());

    expect(
      await screen.findByRole('menuitem', { name: /Mi cuenta · My account/i }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('menuitem', { name: /Cerrar sesión · Log out/i }));
    await waitFor(() => expect(logoutMutate).toHaveBeenCalledTimes(1));
  });

  it('navigates to /account from the account menu', async () => {
    renderAtKey('MNT');

    await userEvent.click(accountToggle());
    await userEvent.click(await screen.findByRole('menuitem', { name: /Mi cuenta · My account/i }));

    // Navigated away from the TopBar route.
    await waitFor(() => expect(screen.queryByPlaceholderText(/Buscar/i)).not.toBeInTheDocument());
  });

  it('falls back to the em-dash when the user has no name', () => {
    useMeFn.mockReturnValue({ data: { id: 'u1', role: 'admin' } });
    renderAtKey('MNT');

    // me.data?.name?.split(...) ?? '—' → the dash placeholder for the account button label.
    expect(accountToggle().textContent).toContain('—');
  });
});
