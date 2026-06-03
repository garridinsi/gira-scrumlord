// SPDX-License-Identifier: GPL-3.0-or-later
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
// Self-hosted EG fonts — bundled by Vite (no Google Fonts CDN: GDPR-clean, no
// external dependency, and the CSP stays strict 'self'). Weights match the design.
import '@fontsource/big-shoulders-display/400.css';
import '@fontsource/big-shoulders-display/500.css';
import '@fontsource/big-shoulders-display/700.css';
import '@fontsource/big-shoulders-display/800.css';
import '@fontsource/big-shoulders-display/900.css';
import '@fontsource/big-shoulders-stencil-display/500.css';
import '@fontsource/big-shoulders-stencil-display/700.css';
import '@fontsource/big-shoulders-stencil-display/900.css';
import '@fontsource/dm-sans/300.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import './index.css';
import { App } from './App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { ToastProvider } from './ui/Toast';
import { consoleBoot } from './ui/lore';

consoleBoot();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// PWA: register the service worker (production only — the dev server has no /sw.js and a
// SW would cache the HMR shell). Failure is non-fatal; the app works without it.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
