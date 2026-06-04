// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-focused cases for SprintsPage: the PointsBar mini-bar branches, the
// start/close/delete row mutations (success + error), the inline create form
// (success, error, cancel), and the page loading / error states. The sibling
// sprints-page.test.tsx owns the happy-path grouping cases; this file is additive
// and renders under a real Route so useParams({ key }) is populated and the
// `enabled: !!key` sprints query actually runs.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import type { SprintRecord } from '../api/client';
import { renderWithProviders } from './render';

// vi.hoisted so the hoisted vi.mock factories can close over the spies.
const { sprintsList, sprintsCreate, start, close, del, toastSpy } = vi.hoisted(() => ({
  sprintsList: vi.fn(),
  sprintsCreate: vi.fn(),
  start: vi.fn(),
  close: vi.fn(),
  del: vi.fn(),
  toastSpy: vi.fn(),
}));

vi.mock('../api/client', () => ({
  projects: {
    sprints: {
      list: (k: string) => sprintsList(k),
      create: (k: string, b: unknown) => sprintsCreate(k, b),
    },
  },
  sprints: {
    start: (id: string) => start(id),
    close: (id: string) => close(id),
    delete: (id: string) => del(id),
  },
  // A real-ish ApiError so `err instanceof ApiError` resolves err.message.
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
vi.mock('../hooks/useProjectTabs', () => ({ useProjectTabs: () => [] }));
// Toasts mount in a portal outside renderWithProviders, so spy on useToast to
// observe the success/error mutation branches instead of probing the DOM.
vi.mock('../ui/Toast', () => ({ useToast: () => toastSpy }));

import { SprintsPage } from '../pages/SprintsPage';

const sprint = (over: Partial<SprintRecord> = {}): SprintRecord => ({
  id: 's1',
  projectId: 'p1',
  name: 'Sprint 1',
  state: 'active',
  goal: 'ship it',
  startDate: null,
  endDate: null,
  committedPoints: 10,
  completedPoints: 5,
  velocity: {
    committedPoints: 10,
    totalPoints: 10,
    completedPoints: 5,
    completedCount: 1,
    totalCount: 2,
  },
  ...over,
});

function renderAt(key = 'MNT') {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:key/sprints" element={<SprintsPage />} />
    </Routes>,
    { route: `/projects/${key}/sprints` },
  );
}

describe('SprintsPage (coverage)', () => {
  beforeEach(() => {
    sprintsList.mockReset();
    sprintsCreate.mockReset();
    start.mockReset();
    close.mockReset();
    del.mockReset();
    toastSpy.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── page loading / error states ─────────────────────────────────────────────

  it('shows the loading state while the sprints query is pending', () => {
    let resolve: (v: SprintRecord[]) => void = () => {};
    sprintsList.mockReturnValue(new Promise<SprintRecord[]>((r) => (resolve = r)));
    renderAt();
    expect(screen.getByText('cargando sprints · loading sprints')).toBeInTheDocument();
    resolve([]);
  });

  it('shows the error state when the sprints query rejects', async () => {
    sprintsList.mockRejectedValue(new Error('boom'));
    renderAt();
    expect(await screen.findByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  // ── PointsBar mini-bar branches ─────────────────────────────────────────────

  it('renders the "—" placeholder when a sprint has no committed/completed points', async () => {
    sprintsList.mockResolvedValue([
      sprint({
        id: 's1',
        name: 'Empty Pts',
        committedPoints: 0,
        completedPoints: 0,
        velocity: undefined,
      }),
    ]);
    renderAt();
    expect(await screen.findByText('Empty Pts')).toBeInTheDocument();
    // The em dash placeholder (PointsBar) plus the dateRange dash render; assert the
    // pts bar text never appears for a zero/zero sprint.
    expect(screen.queryByText(/\/ 0 pts/)).not.toBeInTheDocument();
  });

  it('renders the points bar with the completed/committed tally for an active sprint', async () => {
    sprintsList.mockResolvedValue([
      // velocity completedPoints (8) takes precedence over completedPoints; committed 10 → 8/10
      sprint({
        id: 's1',
        name: 'Bar Sprint',
        committedPoints: 10,
        completedPoints: 5,
        velocity: {
          committedPoints: 10,
          totalPoints: 10,
          completedPoints: 8,
          completedCount: 2,
          totalCount: 3,
        },
      }),
    ]);
    renderAt();
    expect(await screen.findByText('Bar Sprint')).toBeInTheDocument();
    expect(screen.getByText('8 / 10 pts')).toBeInTheDocument();
  });

  it('renders a closed sprint with its completed-points tally and CERRADO label', async () => {
    sprintsList.mockResolvedValue([
      sprint({
        id: 's1',
        name: 'Done Sprint',
        state: 'closed',
        committedPoints: 12,
        completedPoints: 12,
        velocity: undefined,
        startDate: '2026-05-01T00:00:00Z',
        endDate: '2026-05-15T00:00:00Z',
        goal: 'wrap up',
      }),
    ]);
    renderAt();
    expect(await screen.findByText('Done Sprint')).toBeInTheDocument();
    // committedPoints != null branch + closed completedPoints branch
    expect(screen.getByText(/12 pts comprometidos/)).toBeInTheDocument();
    // d >= c → green; tally falls back to completedPoints (12) when no velocity
    expect(screen.getByText('12 / 12 pts')).toBeInTheDocument();
    // closed rows render the CERRADO action label (uppercase span)
    expect(screen.getAllByText('CERRADO').length).toBeGreaterThan(0);
    // goal renders alongside the date range (` · wrap up`)
    expect(screen.getByText(/wrap up/)).toBeInTheDocument();
  });

  // ── start / close / delete mutations ────────────────────────────────────────

  it('starts a future sprint and toasts success', async () => {
    sprintsList.mockResolvedValue([sprint({ id: 'sf', name: 'Future One', state: 'future' })]);
    start.mockResolvedValue({});
    renderAt();
    await screen.findByText('Future One');
    await userEvent.click(screen.getByRole('button', { name: /Iniciar/ }));
    await waitFor(() => expect(start).toHaveBeenCalledWith('sf'));
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Sprint iniciado · Sprint started' }),
      ),
    );
  });

  it('toasts the danger branch when starting a sprint fails', async () => {
    sprintsList.mockResolvedValue([sprint({ id: 'sf', name: 'Future Fail', state: 'future' })]);
    start.mockRejectedValue(new Error('start blew up'));
    renderAt();
    await screen.findByText('Future Fail');
    await userEvent.click(screen.getByRole('button', { name: /Iniciar/ }));
    await waitFor(() => expect(start).toHaveBeenCalled());
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'danger', title: 'Error al iniciar · Start failed' }),
      ),
    );
  });

  it('closes an active sprint and toasts success', async () => {
    sprintsList.mockResolvedValue([sprint({ id: 'sa', name: 'Active One', state: 'active' })]);
    close.mockResolvedValue({});
    renderAt();
    await screen.findByText('Active One');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sprint' }));
    await waitFor(() => expect(close).toHaveBeenCalledWith('sa'));
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Sprint cerrado · Sprint closed' }),
      ),
    );
  });

  it('toasts the danger branch when closing a sprint fails', async () => {
    sprintsList.mockResolvedValue([sprint({ id: 'sa', name: 'Active Fail', state: 'active' })]);
    close.mockRejectedValue(new Error('close blew up'));
    renderAt();
    await screen.findByText('Active Fail');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sprint' }));
    await waitFor(() => expect(close).toHaveBeenCalled());
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'danger', title: 'Error al cerrar · Close failed' }),
      ),
    );
  });

  it('deletes a future sprint after confirm and toasts success', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    sprintsList.mockResolvedValue([sprint({ id: 'sd', name: 'Delete Me', state: 'future' })]);
    del.mockResolvedValue(undefined);
    renderAt();
    await screen.findByText('Delete Me');
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(confirmSpy).toHaveBeenCalledWith('¿Eliminar sprint "Delete Me"?');
    await waitFor(() => expect(del).toHaveBeenCalledWith('sd'));
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Sprint eliminado · Sprint deleted' }),
      ),
    );
  });

  it('does not delete when the confirm dialog is dismissed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    sprintsList.mockResolvedValue([sprint({ id: 'sd', name: 'Keep Me', state: 'future' })]);
    renderAt();
    await screen.findByText('Keep Me');
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it('toasts the danger branch when deleting a sprint fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    sprintsList.mockResolvedValue([sprint({ id: 'sd', name: 'Delete Fail', state: 'future' })]);
    del.mockRejectedValue(new Error('delete blew up'));
    renderAt();
    await screen.findByText('Delete Fail');
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    await waitFor(() => expect(del).toHaveBeenCalled());
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'danger', title: 'Error al eliminar · Delete failed' }),
      ),
    );
  });

  // ── inline create form ──────────────────────────────────────────────────────

  it('creates a sprint through the inline form and toasts success', async () => {
    sprintsList.mockResolvedValue([]);
    sprintsCreate.mockResolvedValue({ id: 'new', name: 'S-05' });
    renderAt('MNT');
    await screen.findByText(/Create the first sprint/i);

    await userEvent.click(screen.getByRole('button', { name: '+ Sprint' }));
    // form is now mounted
    const nameInput = await screen.findByPlaceholderText(/Nombre del sprint/);
    await userEvent.type(nameInput, 'S-05');
    await userEvent.type(screen.getByPlaceholderText('Sprint goal'), 'a goal');

    // date inputs (type=date) — fireEvent.change is the reliable jsdom path
    const startInput = screen.getByText('Inicio').parentElement!.querySelector('input')!;
    const endInput = screen.getByText('Fin').parentElement!.querySelector('input')!;
    fireEvent.change(startInput, { target: { value: '2026-06-01' } });
    fireEvent.change(endInput, { target: { value: '2026-06-14' } });

    await userEvent.click(screen.getByRole('button', { name: '+ Crear' }));

    await waitFor(() =>
      expect(sprintsCreate).toHaveBeenCalledWith(
        'MNT',
        expect.objectContaining({ name: 'S-05', goal: 'a goal' }),
      ),
    );
    const [, body] = sprintsCreate.mock.calls[0]!;
    expect((body as { startDate?: Date }).startDate).toBeInstanceOf(Date);
    expect((body as { endDate?: Date }).endDate).toBeInstanceOf(Date);
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'ok', title: 'Sprint creado · Sprint created' }),
      ),
    );
    // onSuccess → onDone() unmounts the form
    await waitFor(() => expect(screen.queryByPlaceholderText(/Nombre del sprint/)).toBeNull());
  });

  it('keeps the create button disabled until a name is typed', async () => {
    sprintsList.mockResolvedValue([]);
    renderAt();
    await screen.findByText(/Create the first sprint/i);
    await userEvent.click(screen.getByRole('button', { name: '+ Sprint' }));
    const createBtn = await screen.findByRole('button', { name: '+ Crear' });
    expect(createBtn).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText(/Nombre del sprint/), 'X');
    expect(createBtn).toBeEnabled();
  });

  it('surfaces the create error branch (toast + inline error) without unmounting the form', async () => {
    sprintsList.mockResolvedValue([]);
    sprintsCreate.mockRejectedValue(new Error('create failed'));
    renderAt();
    await screen.findByText(/Create the first sprint/i);
    await userEvent.click(screen.getByRole('button', { name: '+ Sprint' }));
    await userEvent.type(await screen.findByPlaceholderText(/Nombre del sprint/), 'Boom');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear' }));

    await waitFor(() => expect(sprintsCreate).toHaveBeenCalled());
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'danger', title: 'Error al crear sprint · Create failed' }),
      ),
    );
    // mut.isError → inline error row renders, form stays mounted
    expect(await screen.findByText(/Error: create failed/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nombre del sprint/)).toBeInTheDocument();
  });

  it('cancels the inline create form via the Cancelar button', async () => {
    sprintsList.mockResolvedValue([]);
    renderAt();
    await screen.findByText(/Create the first sprint/i);
    await userEvent.click(screen.getByRole('button', { name: '+ Sprint' }));
    await screen.findByPlaceholderText(/Nombre del sprint/);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByPlaceholderText(/Nombre del sprint/)).toBeNull());
  });

  // ── date range rendering ────────────────────────────────────────────────────

  it('renders the formatted date range when a sprint has start and end dates', async () => {
    sprintsList.mockResolvedValue([
      sprint({
        id: 's1',
        name: 'Dated Sprint',
        state: 'active',
        startDate: '2026-05-25T00:00:00Z',
        endDate: '2026-06-08T00:00:00Z',
        goal: null,
      }),
    ]);
    const { container } = renderAt();
    await screen.findByText('Dated Sprint');
    // es-ES short date → "→" separator present in the row meta line
    expect(within(container as HTMLElement).getByText(/→/)).toBeInTheDocument();
  });
});
