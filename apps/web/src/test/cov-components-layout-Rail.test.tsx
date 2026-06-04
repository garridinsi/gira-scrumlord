// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-focused cases for the staff Rail: the project-scoped item counts (board /
// backlog / sprints), the monthly-cadence swap, the active-item styling, the navigate +
// drawer-close handler, and the foot health row (api/db dots).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

const { board, backlog, get, sprintsList, health } = vi.hoisted(() => ({
  board: vi.fn(),
  backlog: vi.fn(),
  get: vi.fn(),
  sprintsList: vi.fn(),
  health: vi.fn(),
}));
vi.mock('../api/client', () => ({
  projects: {
    board: () => board(),
    backlog: () => backlog(),
    get: () => get(),
    sprints: { list: () => sprintsList() },
  },
  system: { health: () => health() },
}));

import { Rail } from '../components/layout/Rail';

// Render the Rail under a real :key route so useParams() yields a project key and the
// project-scoped queries (enabled: !!key) actually run.
function renderAtKey(key: string, path = '/board') {
  return renderWithProviders(
    <Routes>
      <Route path={`/projects/:key${path}`} element={<Rail open />} />
    </Routes>,
    { route: `/projects/${key}${path}` },
  );
}

describe('Rail (coverage)', () => {
  beforeEach(() => {
    // Default: a sprints-cadence project. Counts are chosen distinct from each other and
    // from the static lore nums (audit ":666", scrumlord "4") so getBy* stays unambiguous:
    // board total = 7 (3 + 4 issues), backlog = 9, sprints = 5. ok health (api OK, db up).
    board.mockReset().mockResolvedValue({
      columns: [{ issues: [{}, {}, {}] }, { issues: [{}, {}, {}, {}] }],
    });
    backlog.mockReset().mockResolvedValue([{}, {}, {}, {}, {}, {}, {}, {}, {}]);
    get.mockReset().mockResolvedValue({ key: 'MNT', name: 'Mantenimiento', cadence: 'sprints' });
    sprintsList.mockReset().mockResolvedValue([{}, {}, {}, {}, {}]);
    health.mockReset().mockResolvedValue({ status: 'ok', db: true, name: 'gira', version: '1' });
  });

  it('renders the project-scoped counts (board / backlog / sprints) under a :key route', async () => {
    renderAtKey('MNT');

    // boardTotal = 3 + 4 = 7 (lines 58, 80); backlog.length = 9 (line 88); sprints.length = 5
    // (line 70). The cadenceItem is the sprints variant (lines 62-71). Scope each count to its
    // own button so the assertion is unambiguous.
    const boardBtn = await screen.findByRole('button', { name: /Tablero/i });
    await waitFor(() => expect(boardBtn.textContent).toContain('7'));
    expect(screen.getByRole('button', { name: /Pendientes/i }).textContent).toContain('9');
    expect(screen.getByRole('button', { name: /Sprints/i }).textContent).toContain('5');
  });

  it('marks the board item active when on the board route (active styling)', async () => {
    renderAtKey('MNT', '/board');

    // pathname starts with `${p}/board` → isActive(board) is true, so the button gets the
    // `active` class plus the active border/background styling (lines 122/131/140/142/151).
    const boardBtn = await screen.findByRole('button', { name: /Tablero/i });
    expect(boardBtn.className).toContain('active');
  });

  it('marks the Summary item active only on the exact project root (id === summary branch)', async () => {
    // Route is exactly `${p}` (/projects/MNT) → isActive(summary) compares pathname === base
    // (line 122) and is true here.
    renderWithProviders(
      <Routes>
        <Route path="/projects/:key" element={<Rail open />} />
      </Routes>,
      { route: '/projects/MNT' },
    );

    const summaryBtn = await screen.findByRole('button', { name: /Resumen/i });
    expect(summaryBtn.className).toContain('active');
  });

  it('swaps in the Monthly item for a maintenance (monthly-cadence) project', async () => {
    get.mockResolvedValue({ key: 'MNT', name: 'Mantenimiento', cadence: 'monthly' });
    renderAtKey('MNT', '/monthly');

    // isMonthly (line 46) true → cadenceItem is the monthly variant (lines 62-63); the
    // sprints query stays disabled (line 50). "Mensual" replaces "Sprints".
    expect(await screen.findByText('Mensual')).toBeInTheDocument();
    expect(screen.queryByText('Sprints')).not.toBeInTheDocument();
  });

  it('navigates and closes the mobile drawer when an item is clicked', async () => {
    const onNavigate = vi.fn();
    renderWithProviders(
      <Routes>
        <Route path="/projects/:key/board" element={<Rail open onNavigate={onNavigate} />} />
        <Route path="/billing" element={<Rail open onNavigate={onNavigate} />} />
      </Routes>,
      { route: '/projects/MNT/board' },
    );

    // Click Billing → go('/billing') runs navigate(to) + onNavigate?.() (lines 26-28).
    await userEvent.click(await screen.findByRole('button', { name: /Facturación/i }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
  });

  it('shows the api/db health as up when /health is ok', async () => {
    renderAtKey('MNT');

    // ok = health.data?.status === 'ok' (line 166) → api "OK" (line 198); db truthy → "pg16 · up"
    // (line 205). The dots render without the `red` modifier (lines 195, 202).
    expect(await screen.findByText('OK')).toBeInTheDocument();
    expect(screen.getByText('pg16 · up')).toBeInTheDocument();
  });

  it('shows the api/db health as degraded when /health reports not-ok', async () => {
    health.mockResolvedValue({ status: 'degraded', db: false, name: 'gira', version: '1' });
    renderAtKey('MNT');

    // status !== 'ok' → api placeholder "…" (line 198) with the red dot (line 195); db falsy →
    // db placeholder "…" (line 205) with the red dot (line 202).
    await waitFor(() => {
      const placeholders = screen.getAllByText('…');
      expect(placeholders.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('renders the global nav without a :key (project queries disabled, em-dash key)', () => {
    renderWithProviders(<Rail />);

    // No :key → useParams() is {}, enabled:!!key queries never run; `open` defaults false so
    // the aside lacks rail--open (line 169 false branch). The // project head shows "—".
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Facturación')).toBeInTheDocument();
  });
});
