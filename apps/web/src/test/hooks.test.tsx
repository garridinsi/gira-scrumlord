// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const { me, logout, projectGet } = vi.hoisted(() => ({ me: vi.fn(), logout: vi.fn(), projectGet: vi.fn() }));
vi.mock('../api/client', () => ({
  auth: { me: () => me(), logout: () => logout() },
  projects: { get: (k: string) => projectGet(k) },
}));

import { useMe, useLogout } from '../hooks/useAuth';
import { useProjectTabs } from '../hooks/useProjectTabs';

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

describe('auth hooks', () => {
  beforeEach(() => {
    me.mockReset();
    logout.mockReset();
    projectGet.mockReset();
  });

  it('useMe returns the current user', async () => {
    me.mockResolvedValue({ id: 'u1', name: 'Ada' });
    const { result } = renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data!.name).toBe('Ada');
  });

  it('useLogout calls auth.logout', async () => {
    logout.mockResolvedValue({});
    const { result } = renderHook(() => useLogout(), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });
});

describe('useProjectTabs', () => {
  beforeEach(() => projectGet.mockReset());

  it('builds Sprints tabs for a sprints-cadence project (active flagged)', async () => {
    projectGet.mockResolvedValue({ key: 'PRJ', cadence: 'sprints' });
    const { result } = renderHook(() => useProjectTabs('PRJ', 'board'), { wrapper });
    await waitFor(() => expect(result.current.some((t) => t.en === 'Sprints')).toBe(true));
    expect(result.current.find((t) => t.en === 'Board')?.active).toBe(true);
  });

  it('builds the Monthly tab for a monthly-cadence project', async () => {
    projectGet.mockResolvedValue({ key: 'PRJ', cadence: 'monthly' });
    const { result } = renderHook(() => useProjectTabs('PRJ', 'monthly'), { wrapper });
    await waitFor(() => expect(result.current.some((t) => t.en === 'Monthly')).toBe(true));
  });
});
