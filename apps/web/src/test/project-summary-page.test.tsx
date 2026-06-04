// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
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
  // STABLE reference — writer strips read me.data.role; a fresh object would
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
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useAuth', () => ({ useMe: () => meState }));
vi.mock('../hooks/useProjectTabs', () => ({ useProjectTabs: () => [] }));
// Toast lives behind a React context whose default value is a no-op, so a mutation's
// success/error toast never reaches the DOM under renderWithProviders. Spy on useToast
// to assert the toast payloads directly.
vi.mock('../ui/Toast', () => ({ useToast: () => toast }));

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

describe('ProjectSummaryPage', () => {
  beforeEach(() => {
    summary.mockReset();
    sprintsList.mockReset().mockResolvedValue([]);
    projectGet.mockReset().mockResolvedValue(baseProject());
    update.mockReset().mockResolvedValue(baseProject());
    clientsList.mockReset().mockResolvedValue([]);
    slaPolicies.mockReset().mockResolvedValue([]);
    slaUpsert.mockReset().mockResolvedValue({});
    slaAttainment.mockReset().mockResolvedValue({
      projectKey: 'MNT',
      response: { applicable: 0, met: 0, pct: null },
      resolution: { applicable: 0, met: 0, pct: null },
    });
    toast.mockReset();
    meState.data = { role: 'admin' };
  });

  // ── loading / error / empty ────────────────────────────────────────────────
  it('shows the loading state while queries are pending', () => {
    summary.mockReturnValue(new Promise(() => {})); // never resolves
    sprintsList.mockReturnValue(new Promise(() => {}));
    renderAt('PRJ');
    expect(screen.getByText('cargando resumen · loading summary')).toBeInTheDocument();
  });

  it('renders the error state with the error message when the summary query fails', async () => {
    summary.mockRejectedValue(new Error('boom-summary'));
    renderAt('PRJ');
    expect(await screen.findByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText('boom-summary')).toBeInTheDocument();
  });

  it('renders the SIN DATOS empty state when no sprints and no issues exist', async () => {
    summary.mockResolvedValue(baseSummary());
    sprintsList.mockResolvedValue([]);
    renderAt('PRJ');
    expect(await screen.findByText('SIN DATOS')).toBeInTheDocument();
    expect(
      screen.getByText(/Empieza creando tickets y sprints · Start by creating issues and sprints/),
    ).toBeInTheDocument();
  });

  it('shows + edits the SLA policy targets and shows attainment (B2)', async () => {
    summary.mockResolvedValue(baseSummary());
    slaPolicies.mockResolvedValue([
      { id: 'p1', projectId: 'pr1', priority: null, responseMinutes: 480, resolutionMinutes: 2400 },
    ]);
    slaAttainment.mockResolvedValue({
      projectKey: 'PRJ',
      response: { applicable: 4, met: 3, pct: 75 },
      resolution: { applicable: 2, met: 2, pct: 100 },
    });
    slaUpsert.mockResolvedValue({
      id: 'p1',
      projectId: 'pr1',
      priority: null,
      responseMinutes: 240,
      resolutionMinutes: 2400,
    });
    renderAt('PRJ');

    // Strip renders with the default policy in hours + attainment %.
    expect(await screen.findByText('// SLA · OBJETIVOS · TARGETS')).toBeInTheDocument();
    expect(
      await screen.findByText((t) => t.includes('resp 75%') && t.includes('reso 100%')),
    ).toBeInTheDocument();
    const respInput = screen.getByLabelText(/Respuesta \(h\) · Response/) as HTMLInputElement;
    expect(respInput.value).toBe('8'); // 480 min / 60

    // Edit response → 4h and save.
    await userEvent.clear(respInput);
    await userEvent.type(respInput, '4');
    await userEvent.click(screen.getByRole('button', { name: /Guardar SLA · Save SLA/ }));
    await waitFor(() =>
      expect(slaUpsert).toHaveBeenCalledWith('PRJ', {
        responseMinutes: 240,
        resolutionMinutes: 2400,
      }),
    );
  });

  // ── header + stat tiles ─────────────────────────────────────────────────────
  it('renders the header, currency pill, and the four stat tiles with derived values', async () => {
    summary.mockResolvedValue(
      baseSummary({
        totalMinutes: 600, // 10h
        billableMinutes: 300, // 5h → 50%
        accruedCents: 2840500, // EUR 28.405,00
        openIssues: 7,
        doneIssues: 9,
      }),
    );
    renderAt('PRJ');

    // Header
    expect(await screen.findByText('PRJ · Resumen del Proyecto')).toBeInTheDocument();
    expect(screen.getByText('— PROJECT SUMMARY —')).toBeInTheDocument();
    expect(screen.getByText('MONEDA')).toBeInTheDocument();
    expect(screen.getByText('M1 · CORE')).toBeInTheDocument();

    // Open issues tile
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('9 cerrados · done')).toBeInTheDocument();

    // Time logged tile (10h, 5h billable / 50%)
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5h facturable · 50%')).toBeInTheDocument();

    // Accrued money tile — integer part split from decimal
    expect(screen.getByText('28.405')).toBeInTheDocument();
    expect(screen.getByText(',00')).toBeInTheDocument();
    expect(screen.getByText('total acumulado · EUR')).toBeInTheDocument();

    // Velocity tile — no active sprint
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('sin sprint activo')).toBeInTheDocument();

    expect(summary).toHaveBeenCalledWith('PRJ');
    expect(sprintsList).toHaveBeenCalledWith('PRJ');
  });

  it('renders the velocity tile and active-sprint panel when a sprint is active', async () => {
    summary.mockResolvedValue(
      baseSummary({
        totalMinutes: 0,
        billableMinutes: 0,
        openIssues: 3,
        activeSprint: {
          id: 'act1',
          name: 'Sprint 4',
          velocity: {
            committedPoints: 20,
            completedPoints: 15,
            completedCount: 3,
            totalPoints: 20,
            totalCount: 4,
          },
        },
      }),
    );
    renderAt('PRJ');

    // Velocity stat tile shows committedPoints + the active sprint sub-label
    expect(await screen.findByText('sprint activo · Sprint 4')).toBeInTheDocument();
    // "20" appears in both the velocity tile and the active-sprint panel's committed cell.
    expect(screen.getAllByText('20').length).toBeGreaterThanOrEqual(2);

    // Active sprint panel
    expect(screen.getByText('// SPRINT ACTIVO · ACTIVE SPRINT')).toBeInTheDocument();
    // progress = round(15/20*100) = 75%
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument(); // completed pts in panel
  });

  it('shows 0% progress in the active-sprint panel when committed points are zero', async () => {
    summary.mockResolvedValue(
      baseSummary({
        activeSprint: {
          id: 'act0',
          name: 'Zero Sprint',
          velocity: {
            committedPoints: 0,
            completedPoints: 0,
            completedCount: 0,
            totalPoints: 0,
            totalCount: 0,
          },
        },
      }),
    );
    renderAt('PRJ');
    expect(await screen.findByText('// SPRINT ACTIVO · ACTIVE SPRINT')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  // ── velocity chart / sprint table ───────────────────────────────────────────
  it('renders the "no sprint data" velocity chart when sprints carry no points', async () => {
    summary.mockResolvedValue(baseSummary({ openIssues: 2 }));
    // future sprint with 0 committed points → filtered out of the chart data
    sprintsList.mockResolvedValue([sprint({ id: 'f1', state: 'future', committedPoints: 0 })]);
    renderAt('PRJ');
    expect(await screen.findByText('SIN DATOS · NO SPRINT DATA YET')).toBeInTheDocument();
    // header for the empty-chart branch
    expect(screen.getByText(/VELOCIDAD · VELOCITY · HISTÓRICO/)).toBeInTheDocument();
  });

  it('renders the velocity chart with bars, sprint labels, and average velocity', async () => {
    summary.mockResolvedValue(baseSummary({ openIssues: 5 }));
    sprintsList.mockResolvedValue([
      sprint({
        id: 'c1',
        name: 'Sprint Alpha',
        state: 'closed',
        committedPoints: 12,
        startDate: '2026-01-01',
        endDate: '2026-01-14',
      }),
      sprint({ id: 'c2', name: 'S2', state: 'closed', committedPoints: 18 }),
      sprint({ id: 'a3', name: 'S3', state: 'active', committedPoints: 8 }),
    ]);
    renderAt('PRJ');

    // chart header reflects the count of sprints with data
    expect(await screen.findByText(/VELOCIDAD · VELOCITY · ÚLTIMOS 3 SPRINTS/)).toBeInTheDocument();
    // truncated label (name.length > 8 → slice(0,8))
    expect(screen.getByText('Sprint A')).toBeInTheDocument();
    // active sprint EN CURSO tag
    expect(screen.getByText('EN CURSO')).toBeInTheDocument();
    // avg velocity from closed sprints with data: (12 + 18) / 2 = 15
    expect(screen.getByText('MEDIA · 15 pts/sprint')).toBeInTheDocument();
    // SVG accessible label
    expect(screen.getByLabelText('Velocity chart')).toBeInTheDocument();
  });

  it('renders the velocity chart without an average when no closed sprint carries points', async () => {
    summary.mockResolvedValue(baseSummary({ openIssues: 1 }));
    sprintsList.mockResolvedValue([sprint({ id: 'a1', state: 'active', committedPoints: 9 })]);
    renderAt('PRJ');
    expect(await screen.findByText(/VELOCIDAD · VELOCITY · ÚLTIMOS 1 SPRINTS/)).toBeInTheDocument();
    expect(screen.queryByText(/MEDIA ·/)).not.toBeInTheDocument();
  });

  it('renders the sprint history table with localized dates and state labels', async () => {
    summary.mockResolvedValue(baseSummary({ openIssues: 4 }));
    sprintsList.mockResolvedValue([
      sprint({
        id: 'a1',
        name: 'Active S',
        state: 'active',
        committedPoints: 11,
        startDate: '2026-02-01',
        endDate: '2026-02-14',
      }),
      sprint({ id: 'fu1', name: 'Future S', state: 'future', committedPoints: null }),
      sprint({ id: 'cl1', name: 'Closed S', state: 'closed', committedPoints: 7 }),
    ]);
    renderAt('PRJ');

    const table = (await screen.findByText('// SPRINTS · HISTORIAL')).closest('section')!;
    expect(within(table).getByText('3 SPRINTS')).toBeInTheDocument();
    expect(within(table).getByText('ACTIVO')).toBeInTheDocument();
    expect(within(table).getByText('FUTURO')).toBeInTheDocument();
    expect(within(table).getByText('CERRADO')).toBeInTheDocument();
    expect(within(table).getByText('Active S')).toBeInTheDocument();
    // future sprint has no committedPoints → renders the em-dash placeholder
    expect(within(table).getAllByText('—').length).toBeGreaterThan(0);
  });

  // ── ProjectSettingsStrip ─────────────────────────────────────────────────────
  it('renders the project settings strip and saves name/description/client', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ name: 'Old Name', clientId: null }));
    clientsList.mockResolvedValue([{ id: 'cl9', name: 'Acme' }]);
    update.mockResolvedValue(baseProject({ name: 'New Name' }));
    renderAt('PRJ');

    expect(await screen.findByText('// AJUSTES · PROJECT SETTINGS')).toBeInTheDocument();
    expect(screen.getByText('SIN CLIENTE · UNLINKED')).toBeInTheDocument();
    // client select is populated from clients.list()
    expect(screen.getByRole('option', { name: 'Acme' })).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('Old Name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Name');

    const saveBtn = screen.getByRole('button', { name: /Guardar ajustes · Save settings/ });
    expect(saveBtn).toBeEnabled();
    await userEvent.click(saveBtn);

    await waitFor(() => expect(update).toHaveBeenCalled());
    const settingsCall = update.mock.calls.find(
      (c) => (c[1] as { name?: string }).name === 'New Name',
    );
    expect(settingsCall).toBeTruthy();
    expect(settingsCall![1]).toMatchObject({ name: 'New Name', clientId: null });
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Proyecto actualizado · Project updated' }),
      ),
    );
  });

  it('keeps the settings save button disabled while the form is pristine', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ name: 'Pristine' }));
    renderAt('PRJ');
    const saveBtn = await screen.findByRole('button', {
      name: /Guardar ajustes · Save settings/,
    });
    expect(saveBtn).toBeDisabled();
  });

  it('shows the LINKED badge when the project already has a client', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ clientId: 'cl9' }));
    clientsList.mockResolvedValue([{ id: 'cl9', name: 'Acme' }]);
    renderAt('PRJ');
    expect(await screen.findByText('CLIENTE · LINKED')).toBeInTheDocument();
  });

  it('surfaces an error toast when the settings save fails', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ name: 'Old Name' }));
    // First update (settings) rejects; reject with a plain Error.
    update.mockRejectedValue(new Error('nope'));
    renderAt('PRJ');

    const nameInput = await screen.findByDisplayValue('Old Name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Changed');
    await userEvent.click(screen.getByRole('button', { name: /Guardar ajustes · Save settings/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'danger', title: 'Error al guardar · Save failed' }),
      ),
    );
  });

  // ── CadenceStrip ─────────────────────────────────────────────────────────────
  it('renders the cadence toggle and switches sprints → monthly', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ cadence: 'sprints' }));
    update.mockResolvedValue(baseProject({ cadence: 'monthly' }));
    renderAt('PRJ');

    expect(await screen.findByText('// CADENCIA · CADENCE')).toBeInTheDocument();
    const monthlyBtn = screen.getByRole('button', { name: 'Mensual · Monthly' });
    await userEvent.click(monthlyBtn);

    await waitFor(() => expect(update).toHaveBeenCalledWith('PRJ', { cadence: 'monthly' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'ok',
          title: 'Cadencia actualizada · Cadence updated',
          body: 'Mensual · Monthly',
        }),
      ),
    );
  });

  it('does not call update when clicking the already-active cadence', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ cadence: 'sprints' }));
    renderAt('PRJ');

    const sprintsBtn = await screen.findByRole('button', { name: 'Sprints' });
    await userEvent.click(sprintsBtn);
    // give any pending mutation a tick — none should fire
    await new Promise((r) => setTimeout(r, 0));
    expect(update.mock.calls.some((c) => (c[1] as { cadence?: string }).cadence)).toBe(false);
  });

  it('surfaces an error toast when the cadence update fails', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ cadence: 'sprints' }));
    update.mockRejectedValue(new Error('cadence boom'));
    renderAt('PRJ');

    await userEvent.click(await screen.findByRole('button', { name: 'Mensual · Monthly' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al cambiar cadencia · Cadence update failed',
        }),
      ),
    );
  });

  it('falls back to the sprints cadence when the project has no cadence set', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(baseProject({ cadence: undefined }));
    renderAt('PRJ');
    // Sprints is the active (default) button → still rendered alongside Monthly.
    expect(await screen.findByRole('button', { name: 'Sprints' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mensual · Monthly' })).toBeInTheDocument();
  });

  // ── BudgetEditorStrip ────────────────────────────────────────────────────────
  it('renders the budget editor seeded from server minutes/cents and saves new values', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(
      baseProject({ monthlyBudgetMinutes: 2400, monthlyBudgetCents: 240000 }),
    );
    update.mockResolvedValue(
      baseProject({ monthlyBudgetMinutes: 3000, monthlyBudgetCents: 250000 }),
    );
    renderAt('PRJ');

    expect(await screen.findByText('// PRESUPUESTO MENSUAL · MONTHLY BUDGET')).toBeInTheDocument();
    // Seeded: 2400min → 40h, 240000c → 2400 units; ACTUAL summary line.
    expect(screen.getByDisplayValue('40')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2400')).toBeInTheDocument();
    expect(screen.getByText(/ACTUAL:/)).toBeInTheDocument();

    const hoursInput = screen.getByDisplayValue('40');
    await userEvent.clear(hoursInput);
    await userEvent.type(hoursInput, '50');

    const saveBtns = screen.getAllByRole('button', { name: /Guardar · Save/ });
    await userEvent.click(saveBtns[saveBtns.length - 1]!);

    await waitFor(() => {
      const budgetCall = update.mock.calls.find((c) => 'monthlyBudgetMinutes' in (c[1] as object));
      expect(budgetCall).toBeTruthy();
      // 50h → 3000 minutes; amount untouched (2400 → 240000 cents)
      expect(budgetCall![1]).toMatchObject({
        monthlyBudgetMinutes: 3000,
        monthlyBudgetCents: 240000,
      });
    });
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Presupuesto guardado · Budget saved' }),
      ),
    );
  });

  it('sends null budget fields when both inputs are left empty', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(
      baseProject({ monthlyBudgetMinutes: null, monthlyBudgetCents: null }),
    );
    update.mockResolvedValue(baseProject());
    renderAt('PRJ');

    await screen.findByText('// PRESUPUESTO MENSUAL · MONTHLY BUDGET');
    const saveBtns = screen.getAllByRole('button', { name: /Guardar · Save/ });
    await userEvent.click(saveBtns[saveBtns.length - 1]!);

    await waitFor(() => {
      const budgetCall = update.mock.calls.find((c) => 'monthlyBudgetMinutes' in (c[1] as object));
      expect(budgetCall).toBeTruthy();
      expect(budgetCall![1]).toMatchObject({
        monthlyBudgetMinutes: null,
        monthlyBudgetCents: null,
      });
    });
  });

  it('surfaces an error toast when the budget save fails', async () => {
    summary.mockResolvedValue(baseSummary());
    projectGet.mockResolvedValue(
      baseProject({ monthlyBudgetMinutes: 600, monthlyBudgetCents: null }),
    );
    update.mockRejectedValue(new Error('budget boom'));
    renderAt('PRJ');

    await screen.findByText('// PRESUPUESTO MENSUAL · MONTHLY BUDGET');
    const saveBtns = screen.getAllByRole('button', { name: /Guardar · Save/ });
    await userEvent.click(saveBtns[saveBtns.length - 1]!);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'danger',
          title: 'Error al guardar presupuesto · Budget save failed',
        }),
      ),
    );
  });

  // ── role gating ──────────────────────────────────────────────────────────────
  it('hides the writer-only strips for a viewer role', async () => {
    meState.data = { role: 'viewer' };
    summary.mockResolvedValue(baseSummary({ openIssues: 1 }));
    projectGet.mockResolvedValue(baseProject());
    renderAt('PRJ');

    // The summary header still renders…
    expect(await screen.findByText('PRJ · Resumen del Proyecto')).toBeInTheDocument();
    // Cadence strip is NOT writer-gated → still present (await its project query).
    expect(await screen.findByText('// CADENCIA · CADENCE')).toBeInTheDocument();
    // …but the writer-only settings and budget strips do not.
    expect(screen.queryByText('// AJUSTES · PROJECT SETTINGS')).not.toBeInTheDocument();
    expect(screen.queryByText('// PRESUPUESTO MENSUAL · MONTHLY BUDGET')).not.toBeInTheDocument();
  });
});
