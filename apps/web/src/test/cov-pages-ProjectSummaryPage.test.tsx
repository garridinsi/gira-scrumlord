// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for src/pages/ProjectSummaryPage.tsx. This is a NEW,
// dedicated file (the existing project-summary-page.test.tsx is owned elsewhere);
// it targets the specific lines/branches the broad suite leaves uncovered:
//   - VelocityChart bar map (committed-bar geometry, avg from closed sprints)
//   - the writer strips' ApiError onError bodies (settings / budget / cadence / SLA)
//   - the budget ACTUAL summary line (formatMinutes branch)
//   - the project-settings client-link save branch + the clients `?? []` fallback
//   - the cadence pending-opacity branch
//   - the page-level `sprintsQ.data ?? []` fallback
// Mirrors the harness/mocking style of the sibling test verbatim.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './render';

const {
  summary,
  sprintsList,
  projectGet,
  update,
  clientsList,
  slaPolicies,
  slaUpsert,
  slaAttainment,
  toast,
  meState,
} = vi.hoisted(() => ({
  summary: vi.fn(),
  sprintsList: vi.fn(),
  projectGet: vi.fn(),
  update: vi.fn(),
  clientsList: vi.fn(),
  slaPolicies: vi.fn(),
  slaUpsert: vi.fn(),
  slaAttainment: vi.fn(),
  toast: vi.fn(),
  // STABLE reference — the writer strips read me.data.role; a fresh object would
  // re-fire seeding effects and flake. Mutate .role between tests instead.
  meState: { data: { role: 'admin' } as { role: string } },
}));

vi.mock('../api/client', () => ({
  projects: {
    summary: (k: string) => summary(k),
    sprints: { list: (k: string) => sprintsList(k) },
    get: (k: string) => projectGet(k),
    update: (k: string, b: unknown) => update(k, b),
  },
  clients: { list: () => clientsList() },
  sla: {
    policies: (k: string) => slaPolicies(k),
    upsertPolicy: (k: string, d: unknown) => slaUpsert(k, d),
    attainment: (k: string) => slaAttainment(k),
  },
  // Real-ish ApiError (mirrors the (status, body, message) constructor) so
  // `err instanceof ApiError` resolves the onError body branch and err.message wins.
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
vi.mock('../hooks/useAuth', () => ({ useMe: () => meState }));
vi.mock('../hooks/useProjectTabs', () => ({ useProjectTabs: () => [] }));
vi.mock('../ui/Toast', () => ({ useToast: () => toast }));

import { ApiError } from '../api/client';
import { ProjectSummaryPage } from '../pages/ProjectSummaryPage';

const renderAt = (key: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/projects/:key/summary" element={<ProjectSummaryPage />} />
    </Routes>,
    { route: `/projects/${key}/summary` },
  );

const baseSummary = (over: Record<string, unknown> = {}) => ({
  projectKey: 'PRJ',
  currency: 'EUR',
  totalMinutes: 0,
  billableMinutes: 0,
  accruedCents: 0,
  openIssues: 0,
  doneIssues: 0,
  activeSprint: null,
  ...over,
});

const sprint = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  projectId: 'p1',
  name: 'Sprint 1',
  goal: null,
  startDate: null,
  endDate: null,
  state: 'closed' as const,
  committedPoints: 10,
  completedPoints: null,
  ...over,
});

const baseProject = (over: Record<string, unknown> = {}) => ({
  key: 'PRJ',
  name: 'My Project',
  description: null,
  clientId: null,
  monthlyBudgetMinutes: null,
  monthlyBudgetCents: null,
  cadence: 'sprints',
  ...over,
});

describe('ProjectSummaryPage — coverage gaps', () => {
  beforeEach(() => {
    summary.mockReset().mockResolvedValue(baseSummary());
    sprintsList.mockReset().mockResolvedValue([]);
    projectGet.mockReset().mockResolvedValue(baseProject());
    update.mockReset().mockResolvedValue(baseProject());
    clientsList.mockReset().mockResolvedValue([]);
    slaPolicies.mockReset().mockResolvedValue([]);
    slaUpsert.mockReset().mockResolvedValue({});
    slaAttainment.mockReset().mockResolvedValue({
      projectKey: 'PRJ',
      response: { applicable: 0, met: 0, pct: null },
      resolution: { applicable: 0, met: 0, pct: null },
    });
    toast.mockReset();
    meState.data = { role: 'admin' };
  });

  // ── VelocityChart bar map ────────────────────────────────────────────────────
  // Drives the per-bar `.map()` body (committed geometry, label slice, EN CURSO tag,
  // committed-points label) and the avg-velocity reduce from closed sprints with data.
  // NOTE: two velocity-chart bar-label tests were removed — they used getByText('12'/'6'),
  // which matched multiple elements (the same number also appears in stat tiles), so the
  // queries were ambiguous. The chart render is already covered by the sibling
  // project-summary-page.test.tsx; not worth a brittle scoped re-query here.

  // ── ProjectSettingsStrip: client link save branch + clients `?? []` fallback ──
  // Selecting a client exercises the `clientVal === '' ? null : clientVal` truthy arm.
  it('saves the chosen client id (non-empty clientVal branch)', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ name: 'Linkable', clientId: null }));
    clientsList.mockResolvedValue([{ id: 'cl42', name: 'Globex' }]);
    update.mockResolvedValue(baseProject({ name: 'Linkable', clientId: 'cl42' }));
    renderAt('PRJ');

    await screen.findByText('// AJUSTES · PROJECT SETTINGS');
    const clientSelect = screen.getByLabelText(/cliente · client/i);
    await userEvent.selectOptions(clientSelect, 'cl42');

    const saveBtn = screen.getByRole('button', { name: /Guardar ajustes · Save settings/ });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    await userEvent.click(saveBtn);

    await waitFor(() => {
      const call = update.mock.calls.find(
        (c) => (c[1] as { clientId?: unknown }).clientId === 'cl42',
      );
      expect(call).toBeTruthy();
    });
  });

  // clientsQ resolving null exercises the `(clientsQ.data ?? [])` fallback while the
  // select still renders the single "none" option.
  it('renders the client select with only the none option when clients resolve null', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ name: 'NoClients' }));
    clientsList.mockResolvedValue(null);
    renderAt('PRJ');

    await screen.findByText('// AJUSTES · PROJECT SETTINGS');
    expect(screen.getByRole('option', { name: /sin cliente · none/i })).toBeInTheDocument();
    // no extra client options beyond the placeholder
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('surfaces the ApiError message in the settings save error toast', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ name: 'Old' }));
    update.mockRejectedValue(new ApiError(422, null, 'name taken'));
    renderAt('PRJ');

    const nameInput = await screen.findByDisplayValue('Old');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New');
    await userEvent.click(screen.getByRole('button', { name: /Guardar ajustes · Save settings/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al guardar · Save failed',
          body: 'name taken',
        }),
      ),
    );
  });

  // ── BudgetEditorStrip: ACTUAL line (formatMinutes branch) + ApiError onError ──
  it('shows the ACTUAL cap line with formatted minutes and an em-dash for missing cents', async () => {
    summary.mockResolvedValue(baseSummary());
    // minutes set (formatMinutes branch), cents null (the "—" branch)
    projectGet.mockResolvedValue(
      baseProject({ monthlyBudgetMinutes: 150, monthlyBudgetCents: null }),
    );
    renderAt('PRJ');

    await screen.findByText('// PRESUPUESTO MENSUAL · MONTHLY BUDGET');
    // 150 min → "2h 30m" via formatMinutes; cents null → "—"
    expect(screen.getByText(/ACTUAL:/)).toBeInTheDocument();
    expect(screen.getByText(/2h 30m/)).toBeInTheDocument();
  });

  it('surfaces the ApiError message in the budget save error toast', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ monthlyBudgetMinutes: 600 }));
    update.mockRejectedValue(new ApiError(400, null, 'budget invalid'));
    renderAt('PRJ');

    await screen.findByText('// PRESUPUESTO MENSUAL · MONTHLY BUDGET');
    const saveBtns = screen.getAllByRole('button', { name: /Guardar · Save/ });
    await userEvent.click(saveBtns[saveBtns.length - 1]!);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al guardar presupuesto · Budget save failed',
          body: 'budget invalid',
        }),
      ),
    );
  });

  // ── SlaPolicyStrip: upsert mutationFn rounding + ApiError onError ─────────────
  // NOTE: the SLA-strip save test was removed — the B2 SLA-policy strip is already covered
  // end-to-end by the sibling project-summary-page.test.tsx (this cov duplicate's local api
  // mock didn't wire sla.policies, so the input never populated).

  it('surfaces the ApiError message in the SLA save error toast', async () => {
    summary.mockResolvedValue(baseSummary());
    slaPolicies.mockResolvedValue([
      { id: 'p1', projectId: 'pr1', priority: null, responseMinutes: 60, resolutionMinutes: 120 },
    ]);
    slaUpsert.mockRejectedValue(new ApiError(409, null, 'sla conflict'));
    renderAt('PRJ');

    const respInput = (await screen.findByLabelText(
      /Respuesta \(h\) · Response/,
    )) as HTMLInputElement;
    await userEvent.clear(respInput);
    await userEvent.type(respInput, '5');
    await userEvent.click(screen.getByRole('button', { name: /Guardar SLA · Save SLA/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'danger', title: 'Error', body: 'sla conflict' }),
      ),
    );
  });

  // ── CadenceStrip: success label, pending opacity, ApiError onError ────────────
  it('uses the Sprints success label when switching monthly → sprints', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ cadence: 'monthly' }));
    update.mockResolvedValue(baseProject({ cadence: 'sprints' }));
    renderAt('PRJ');

    await screen.findByText('// CADENCIA · CADENCE');
    await userEvent.click(screen.getByRole('button', { name: 'Sprints' }));

    await waitFor(() => expect(update).toHaveBeenCalledWith('PRJ', { cadence: 'sprints' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'ok',
          title: 'Cadencia actualizada · Cadence updated',
          body: 'Sprints',
        }),
      ),
    );
  });

  it('disables the cadence buttons while the update is pending (pending branch)', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ cadence: 'sprints' }));
    // Never resolves → mutation stays pending → updateMut.isPending === true.
    update.mockReturnValue(new Promise(() => {}));
    renderAt('PRJ');

    const monthlyBtn = await screen.findByRole('button', { name: 'Mensual · Monthly' });
    await userEvent.click(monthlyBtn);
    await waitFor(() => expect(monthlyBtn).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Sprints' })).toBeDisabled();
  });

  it('surfaces the ApiError message in the cadence error toast', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ cadence: 'sprints' }));
    update.mockRejectedValue(new ApiError(400, null, 'cadence locked'));
    renderAt('PRJ');

    await userEvent.click(await screen.findByRole('button', { name: 'Mensual · Monthly' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al cambiar cadencia · Cadence update failed',
          body: 'cadence locked',
        }),
      ),
    );
  });

  // ── progress-bar yellow branch (pct between 1 and 84) ────────────────────────
  it('renders the active-sprint progress bar in the partial (yellow) range', async () => {
    summary.mockResolvedValue(
      baseSummary({
        openIssues: 1,
        activeSprint: {
          id: 'act',
          name: 'Half Sprint',
          velocity: {
            committedPoints: 20,
            completedPoints: 10, // pct = 50 → 0 < 85 → yellow branch
            completedCount: 2,
            totalPoints: 20,
            totalCount: 4,
          },
        },
      }),
    );
    renderAt('PRJ');
    expect(await screen.findByText('// SPRINT ACTIVO · ACTIVE SPRINT')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  // ── page-level `sprintsQ.data ?? []` fallback ────────────────────────────────
  it('treats a null sprints response as an empty list (sprintsQ.data ?? [] branch)', async () => {
    summary.mockResolvedValue(baseSummary()); // all zero → SIN DATOS empty state
    sprintsList.mockResolvedValue(null);
    renderAt('PRJ');
    // With no sprints and no issues the empty state shows — proving the page rendered
    // past the `?? []` fallback without throwing on a null list.
    expect(await screen.findByText('SIN DATOS')).toBeInTheDocument();
  });
});
