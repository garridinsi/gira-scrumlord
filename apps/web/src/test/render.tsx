// SPDX-License-Identifier: GPL-3.0-or-later
// Shared test render: wraps a component in the providers the app needs (react-query
// + router) so pages and data-driven components can be exercised in jsdom.
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    // No-op caches: tests deliberately reject queries/mutations to exercise error UI;
    // owning the rejection here keeps it from surfacing as an unhandled rejection.
    queryCache: new QueryCache({ onError: () => {} }),
    mutationCache: new MutationCache({ onError: () => {} }),
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper });
}
