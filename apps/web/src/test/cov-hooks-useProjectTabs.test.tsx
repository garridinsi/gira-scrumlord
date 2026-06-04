// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage for useProjectTabs onClick navigation handlers (lines 40/49/56/64):
// the sibling hooks.test.tsx builds the tab arrays but never invokes the
// `() => navigate(...)` callbacks, so those arrow bodies stay uncovered. Here we
// render the hook with an `active` tab that keeps each target tab inactive (so its
// onClick is defined), then call onClick and assert it navigates to the right path.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// vi.hoisted so the hoisted vi.mock factories can close over the spies.
const { projectGet, navigateSpy } = vi.hoisted(() => ({
  projectGet: vi.fn(),
  navigateSpy: vi.fn(),
}));

vi.mock('../api/client', () => ({
  projects: { get: (k: string) => projectGet(k) },
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateSpy };
});

import { useProjectTabs } from '../hooks/useProjectTabs';
import type { SubTab } from '../ui/Subbar';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    queryCache: new QueryCache({ onError: () => {} }),
    mutationCache: new MutationCache({ onError: () => {} }),
  });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function tabByEn(tabs: SubTab[], en: string): SubTab {
  const t = tabs.find((x) => x.en === en);
  expect(t).toBeTruthy();
  return t!;
}

describe('useProjectTabs onClick navigation', () => {
  beforeEach(() => {
    projectGet.mockReset();
    navigateSpy.mockReset();
  });

  it('Backlog onClick navigates to /projects/PRJ/backlog (line 40)', () => {
    // cadence defaults to 'sprints' (query not yet resolved); active='board' keeps Backlog inactive.
    projectGet.mockResolvedValue({ key: 'PRJ', cadence: 'sprints' });
    const { result } = renderHook(() => useProjectTabs('PRJ', 'board'), { wrapper });
    const backlog = tabByEn(result.current, 'Backlog');
    expect(backlog.active).toBe(false);
    expect(backlog.onClick).toBeTruthy();
    act(() => backlog.onClick!());
    expect(navigateSpy).toHaveBeenCalledWith('/projects/PRJ/backlog');
  });

  it('Sprints onClick navigates to /projects/PRJ/sprints (line 56)', () => {
    // sprints cadence shows the Sprints tab; active='board' keeps it inactive.
    projectGet.mockResolvedValue({ key: 'PRJ', cadence: 'sprints' });
    const { result } = renderHook(() => useProjectTabs('PRJ', 'board'), { wrapper });
    const sprints = tabByEn(result.current, 'Sprints');
    expect(sprints.active).toBe(false);
    act(() => sprints.onClick!());
    expect(navigateSpy).toHaveBeenCalledWith('/projects/PRJ/sprints');
  });

  it('Reports onClick navigates to /projects/PRJ (line 64)', () => {
    projectGet.mockResolvedValue({ key: 'PRJ', cadence: 'sprints' });
    const { result } = renderHook(() => useProjectTabs('PRJ', 'board'), { wrapper });
    const reports = tabByEn(result.current, 'Reports');
    expect(reports.active).toBe(false);
    act(() => reports.onClick!());
    expect(navigateSpy).toHaveBeenCalledWith('/projects/PRJ');
  });

  it('Monthly onClick navigates to /projects/PRJ/monthly (line 49)', async () => {
    // monthly cadence must come from resolved query data; active='board' keeps Monthly inactive.
    projectGet.mockResolvedValue({ key: 'PRJ', cadence: 'monthly' });
    const { result } = renderHook(() => useProjectTabs('PRJ', 'board'), { wrapper });
    // Wait for the query to resolve so the Monthly branch (isMonthly) is taken.
    await waitFor(() => expect(result.current.some((t) => t.en === 'Monthly')).toBe(true));
    const monthly = tabByEn(result.current, 'Monthly');
    expect(monthly.active).toBe(false);
    act(() => monthly.onClick!());
    expect(navigateSpy).toHaveBeenCalledWith('/projects/PRJ/monthly');
  });
});
