// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-focused suite for MonthlyPage: error/empty/loading states, the budget
// bars (normal · warn · over), the CSV export, and the per-month invoice mutation
// (success · navigate · toast, plus ApiError and non-ApiError failure bodies).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

// vi.hoisted so the hoisted vi.mock factories can close over the spies.
const { projectGet, projectMonthly, generate, downloadCsvSpy, toastSpy, navigateSpy, role } =
  vi.hoisted(() => ({
    projectGet: vi.fn(),
    projectMonthly: vi.fn(),
    generate: vi.fn(),
    downloadCsvSpy: vi.fn(),
    toastSpy: vi.fn(),
    navigateSpy: vi.fn(),
    // STABLE mutable ref so useMe returns the same object across renders.
    role: { value: 'admin' as string },
  }));

vi.mock('../api/client', () => ({
  projects: { get: (k: string) => projectGet(k), monthly: (k: string) => projectMonthly(k) },
  invoices: { generate: (c: string, b: unknown) => generate(c, b) },
  // A real-ish ApiError (mirrors the real (status, body, message) constructor) so
  // `err instanceof ApiError` resolves the body branch and err.message is the message.
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown, message: string) {
      super(message);
      this.status = status;
      this.body = body;
    }
  },
}));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: { role: role.value } }) }));
vi.mock('../hooks/useProjectTabs', () => ({ useProjectTabs: () => [] }));
vi.mock('../ui/Toast', () => ({ useToast: () => toastSpy }));
// Spy the CSV download so clicking "CSV" exercises exportMonthlyCsv without jsdom Blob URLs.
vi.mock('../lib/csv', async () => {
  const actual = await vi.importActual<typeof import('../lib/csv')>('../lib/csv');
  return { ...actual, downloadCsv: (name: string, rows: unknown) => downloadCsvSpy(name, rows) };
});
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateSpy };
});

import { ApiError } from '../api/client';
import { MonthlyPage } from '../pages/MonthlyPage';

function renderAt(key: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:key/monthly" element={<MonthlyPage />} />
    </Routes>,
    { route: `/projects/${key}/monthly` },
  );
}

describe('MonthlyPage (coverage)', () => {
  beforeEach(() => {
    role.value = 'admin';
    projectGet.mockReset().mockResolvedValue({ key: 'MNT', name: 'Maint', clientId: 'c1' });
    projectMonthly.mockReset();
    generate.mockReset();
    downloadCsvSpy.mockReset();
    toastSpy.mockReset();
    navigateSpy.mockReset();
  });

  // ── Loading / error / empty ────────────────────────────────────────────────

  it('shows the loading state while the monthly query is pending', () => {
    projectMonthly.mockReturnValue(new Promise(() => {}));
    renderAt('MNT');
    expect(screen.getByText(/loading monthly data/i)).toBeInTheDocument();
  });

  it('shows the error state when the monthly query rejects', async () => {
    projectMonthly.mockRejectedValue(new ApiError(500, null, 'rollup exploded'));
    renderAt('MNT');
    expect(await screen.findByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText('rollup exploded')).toBeInTheDocument();
  });

  it('shows the empty "SIN REGISTROS" state when no months are logged', async () => {
    projectMonthly.mockResolvedValue({
      projectKey: 'MNT',
      currency: 'EUR',
      budgetMinutes: null,
      budgetCents: null,
      months: [],
    });
    renderAt('MNT');
    expect(await screen.findByText('SIN REGISTROS')).toBeInTheDocument();
    expect(screen.getByText(/no time logged yet/i)).toBeInTheDocument();
  });

  // ── Budget bars: normal · warn · over ──────────────────────────────────────

  it('renders the budget cap header and the over/warn budget bars', async () => {
    projectMonthly.mockResolvedValue({
      projectKey: 'MNT',
      currency: 'EUR',
      budgetMinutes: 600, // 10h cap
      budgetCents: 60000, // EUR 600,00 cap
      months: [
        // Over budget: billable 720m (12h) > 600m cap → "SOBRE PRESUPUESTO" + percentages > 100.
        { month: '2026-05', totalMinutes: 800, billableMinutes: 720, accruedCents: 72000 },
        // Warn band: 540m (9h) is 90% of the 600m cap (>=80, not over).
        { month: '2026-04', totalMinutes: 540, billableMinutes: 540, accruedCents: 54000 },
      ],
    });
    renderAt('MNT');

    // Localized month labels (formatMonthLabel) and the raw key beneath.
    expect(await screen.findByText('MAYO 2026')).toBeInTheDocument();
    expect(screen.getByText('ABRIL 2026')).toBeInTheDocument();

    // hasBudget header band shows the CAP (formatMinutes / formatMoney). The cents
    // cap "EUR 600,00" also appears inside each cost bar label, so match all of them.
    expect(screen.getByText(/CAP:/)).toBeInTheDocument();
    expect(screen.getAllByText(/EUR 600,00/).length).toBeGreaterThan(0);

    // Over-budget month renders both the percentage and the over-budget banner.
    expect(screen.getAllByText(/OVER BUDGET/).length).toBeGreaterThan(0);
    // The 90% warn percentage appears on the under-cap month's bars.
    expect(screen.getAllByText('90%').length).toBeGreaterThan(0);
    // The over-budget month's minutes/cost bars read 120% (720/600 and 72000/60000).
    expect(screen.getAllByText('120%').length).toBeGreaterThan(0);

    // "total" sub-line shows only when billable != total (the over-budget month).
    expect(screen.getByText(/total/)).toBeInTheDocument();
  });

  // ── CSV export ──────────────────────────────────────────────────────────────

  it('exports the monthly CSV with a header row and one row per month on CSV click', async () => {
    projectMonthly.mockResolvedValue({
      projectKey: 'MNT',
      currency: 'EUR',
      budgetMinutes: null,
      budgetCents: null,
      months: [{ month: '2026-05', totalMinutes: 90, billableMinutes: 90, accruedCents: 9000 }],
    });
    renderAt('MNT');

    await userEvent.click(await screen.findByRole('button', { name: 'CSV' }));

    expect(downloadCsvSpy).toHaveBeenCalledTimes(1);
    // exportMonthlyCsv builds: filename `${key}-mensual` + a header row and one row
    // per month. 90 billable minutes → 1.50 hours, 9000 cents → centsToDecimal "90.00".
    expect(downloadCsvSpy).toHaveBeenCalledWith('MNT-mensual', [
      ['Mes · Month', 'Minutos · Minutes', 'Horas · Hours', 'Coste · Cost (EUR)'],
      ['2026-05', 90, '1.50', '90.00'],
    ]);
  });

  // ── Invoice mutation: success · navigate · toast ────────────────────────────

  it('invoices a month: success toasts ok with number+month and navigates to the invoice', async () => {
    projectGet.mockResolvedValue({ key: 'MNT', name: 'Maint', clientId: 'client-9' });
    projectMonthly.mockResolvedValue({
      projectKey: 'MNT',
      currency: 'EUR',
      budgetMinutes: null,
      budgetCents: null,
      months: [{ month: '2026-05', totalMinutes: 120, billableMinutes: 120, accruedCents: 12000 }],
    });
    generate.mockResolvedValue({ id: 'inv-77', number: 'ANX-2026-0077' });
    renderAt('MNT');

    await userEvent.click(await screen.findByRole('button', { name: /Invoice month/ }));

    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    // periodStart is the 1st, periodEnd is the lastDayOf the month (May → 31).
    expect(generate).toHaveBeenCalledWith('client-9', {
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      notes: 'Mantenimiento 2026-05',
    });
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', body: 'ANX-2026-0077 · 2026-05' }),
      ),
    );
    expect(navigateSpy).toHaveBeenCalledWith('/invoices/inv-77');
  });

  it('surfaces an ApiError message in the danger toast when invoicing fails', async () => {
    projectGet.mockResolvedValue({ key: 'MNT', name: 'Maint', clientId: 'client-9' });
    projectMonthly.mockResolvedValue({
      projectKey: 'MNT',
      currency: 'EUR',
      budgetMinutes: null,
      budgetCents: null,
      months: [{ month: '2026-02', totalMinutes: 60, billableMinutes: 60, accruedCents: 6000 }],
    });
    generate.mockRejectedValue(new ApiError(409, null, 'period is locked'));
    renderAt('MNT');

    await userEvent.click(await screen.findByRole('button', { name: /Invoice month/ }));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al facturar · Invoice failed',
          body: 'period is locked',
        }),
      ),
    );
    // Feb 2026 → lastDayOf is the 28th (non-leap).
    expect(generate).toHaveBeenCalledWith('client-9', {
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
      notes: 'Mantenimiento 2026-02',
    });
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('falls back to "Error" body when the invoice rejection is not an ApiError', async () => {
    projectGet.mockResolvedValue({ key: 'MNT', name: 'Maint', clientId: 'client-9' });
    projectMonthly.mockResolvedValue({
      projectKey: 'MNT',
      currency: 'EUR',
      budgetMinutes: null,
      budgetCents: null,
      months: [{ month: '2026-05', totalMinutes: 60, billableMinutes: 60, accruedCents: 6000 }],
    });
    generate.mockRejectedValue(new TypeError('network'));
    renderAt('MNT');

    await userEvent.click(await screen.findByRole('button', { name: /Invoice month/ }));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'danger', body: 'Error' }),
      ),
    );
  });

  // ── No client → no invoice button, just the "assign a client" hint ──────────

  it('shows the "assign a client" hint instead of the invoice button when the project has no client', async () => {
    projectGet.mockResolvedValue({ key: 'MNT', name: 'Maint', clientId: null });
    projectMonthly.mockResolvedValue({
      projectKey: 'MNT',
      currency: 'EUR',
      budgetMinutes: null,
      budgetCents: null,
      months: [{ month: '2026-05', totalMinutes: 60, billableMinutes: 60, accruedCents: 6000 }],
    });
    renderAt('MNT');

    expect(await screen.findByText(/assign a client to invoice/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Invoice month/ })).not.toBeInTheDocument();
  });

  // ── Viewer role → canInvoice false → no invoice button even with a client ───

  it('hides the invoice button for a viewer (canInvoice false) but keeps a client present', async () => {
    role.value = 'viewer';
    projectGet.mockResolvedValue({ key: 'MNT', name: 'Maint', clientId: 'client-9' });
    projectMonthly.mockResolvedValue({
      projectKey: 'MNT',
      currency: 'EUR',
      budgetMinutes: null,
      budgetCents: null,
      months: [{ month: '2026-05', totalMinutes: 60, billableMinutes: 60, accruedCents: 6000 }],
    });
    renderAt('MNT');

    expect(await screen.findByText('MAYO 2026')).toBeInTheDocument();
    // canInvoice is false and clientId is set → the action cell renders null (no button, no hint).
    expect(screen.queryByRole('button', { name: /Invoice month/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/assign a client to invoice/i)).not.toBeInTheDocument();
  });
});
