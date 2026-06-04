// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage top-up for src/pages/SettingsPage.tsx — surgical cases for the
// branches the main settings-page.test.tsx leaves uncovered: the mutation
// `onError` toast callbacks (incl. the `err instanceof ApiError ? err.message`
// truthy branch), and display fallbacks (missing client/project in a map,
// ended contracts, empty period-lock / runbook states, client-scoped runbook
// articles, multi-row tables, and the assignment-rule create with match fields).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

// Mirror the main test's hoisted mock surface so the (hoisted) vi.mock factory
// can close over these fns and tests can drive resolve/reject + assert calls.
const m = vi.hoisted(() => ({
  clientsList: vi.fn(),
  ratesList: vi.fn(),
  channelsList: vi.fn(),
  intakeSourcesList: vi.fn(),
  intakeRulesList: vi.fn(),
  usersList: vi.fn(),
  projectsList: vi.fn(),
  labelsList: vi.fn(),
  clientsCreate: vi.fn(),
  clientsUpdate: vi.fn(),
  clientsDelete: vi.fn(),
  ratesUpsert: vi.fn(),
  ratesDelete: vi.fn(),
  channelsCreate: vi.fn(),
  channelsDelete: vi.fn(),
  channelsTest: vi.fn(),
  intakeSourcesCreate: vi.fn(),
  intakeSourcesDelete: vi.fn(),
  intakeRulesCreate: vi.fn(),
  intakeRulesDelete: vi.fn(),
  usersCreate: vi.fn(),
  usersUpdate: vi.fn(),
  usersInvite: vi.fn(),
  contractsList: vi.fn(),
  contractsCreate: vi.fn(),
  contractsUpdate: vi.fn(),
  contractsDelete: vi.fn(),
  periodLocksList: vi.fn(),
  periodLocksCreate: vi.fn(),
  periodLocksDelete: vi.fn(),
  kbList: vi.fn(),
  kbCreate: vi.fn(),
  kbUpdate: vi.fn(),
  kbDelete: vi.fn(),
}));

vi.mock('../api/client', () => ({
  clients: {
    list: () => m.clientsList(),
    create: (d: unknown) => m.clientsCreate(d),
    update: (id: string, d: unknown) => m.clientsUpdate(id, d),
    delete: (id: string) => m.clientsDelete(id),
  },
  rates: {
    list: () => m.ratesList(),
    upsert: (d: unknown) => m.ratesUpsert(d),
    delete: (id: string) => m.ratesDelete(id),
  },
  channels: {
    list: () => m.channelsList(),
    create: (d: unknown) => m.channelsCreate(d),
    delete: (id: string) => m.channelsDelete(id),
    test: (id: string) => m.channelsTest(id),
  },
  intake: {
    sources: {
      list: () => m.intakeSourcesList(),
      create: (d: unknown) => m.intakeSourcesCreate(d),
      delete: (id: string) => m.intakeSourcesDelete(id),
    },
    rules: {
      list: (k: string) => m.intakeRulesList(k),
      create: (k: string, d: unknown) => m.intakeRulesCreate(k, d),
      delete: (id: string) => m.intakeRulesDelete(id),
    },
  },
  projects: {
    list: () => m.projectsList(),
    labels: { list: (k: string) => m.labelsList(k) },
  },
  users: {
    list: (all?: boolean) => m.usersList(all),
    create: (d: unknown) => m.usersCreate(d),
    update: (id: string, d: unknown) => m.usersUpdate(id, d),
    invite: (id: string) => m.usersInvite(id),
  },
  contracts: {
    list: (clientId?: string) => m.contractsList(clientId),
    create: (d: unknown) => m.contractsCreate(d),
    update: (id: string, d: unknown) => m.contractsUpdate(id, d),
    delete: (id: string) => m.contractsDelete(id),
  },
  periodLocks: {
    list: (clientId: string) => m.periodLocksList(clientId),
    create: (clientId: string, monthKey: string) => m.periodLocksCreate(clientId, monthKey),
    delete: (id: string) => m.periodLocksDelete(id),
  },
  kb: {
    list: (clientId?: string) => m.kbList(clientId),
    create: (d: unknown) => m.kbCreate(d),
    update: (id: string, d: unknown) => m.kbUpdate(id, d),
    delete: (id: string) => m.kbDelete(id),
  },
  ApiError: class ApiError extends Error {},
}));

const meRef = vi.hoisted(() => ({ current: { role: 'admin' } as { role: string } }));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: meRef.current }) }));

import { SettingsPage } from '../pages/SettingsPage';
// Same class object the source compares against (module is mocked above), so
// `new ApiError(...)` makes `err instanceof ApiError` true → exercises the
// `err.message` branch of every onError toast. The 3-arg shape matches the real
// ApiError(status, body, message) signature so the import type-checks; the
// runtime mock (`extends Error`) just needs the instanceof to hold.
import { ApiError } from '../api/client';

const renderTab = (tab?: string) =>
  renderWithProviders(<SettingsPage />, { route: tab ? `/settings?tab=${tab}` : '/settings' });

const aClient = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'c1',
  name: 'Acme Corp',
  slug: 'acme',
  currency: 'EUR',
  notes: 'a note',
  ...over,
});

const aRate = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'r1',
  scope: 'default',
  hourlyCents: 11500,
  currency: 'EUR',
  clientId: null,
  projectId: null,
  issueId: null,
  ...over,
});

const aChannel = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'ch1',
  name: 'Alertas Slack',
  kind: 'webhook',
  target: 'https://hooks.slack.com/x',
  scope: 'global',
  projectId: null,
  events: ['issue.emergency'],
  active: true,
  ...over,
});

const aSource = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'src1',
  name: 'Grafana prod',
  kind: 'grafana',
  projectId: 'p1',
  defaultType: 'bug',
  defaultPriority: 'high',
  active: true,
  ...over,
});

const aUser = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'u1',
  email: 'ada@example.test',
  name: 'Ada Lovelace',
  kind: 'staff',
  role: 'member',
  clientId: null,
  locale: 'es',
  isActive: true,
  ...over,
});

const aProject = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'p1',
  key: 'GIRA',
  name: 'Gira',
  ...over,
});

const aRule = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'rule1',
  projectId: 'p1',
  order: 0,
  matchType: null,
  matchPriority: null,
  matchLabelId: null,
  assigneeId: 'u1',
  ...over,
});

const aContract = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'k1',
  clientId: 'c1',
  name: 'Retainer 2026',
  retainerCents: 500_000,
  includedHours: 40,
  startDate: null,
  endDate: null,
  status: 'active',
  notes: null,
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
});

const aKb = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'kb1',
  clientId: null,
  title: 'On-call',
  body: 'stay calm',
  createdById: 'u1',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  ...over,
});

describe('SettingsPage — coverage top-up', () => {
  let confirmSpy: { mockRestore: () => void; mockReturnValue: (v: boolean) => unknown };

  beforeEach(() => {
    meRef.current = { role: 'admin' };
    m.clientsList.mockReset().mockResolvedValue([]);
    m.ratesList.mockReset().mockResolvedValue([]);
    m.channelsList.mockReset().mockResolvedValue([]);
    m.intakeSourcesList.mockReset().mockResolvedValue([]);
    m.intakeRulesList.mockReset().mockResolvedValue([]);
    m.usersList.mockReset().mockResolvedValue([]);
    m.projectsList.mockReset().mockResolvedValue([]);
    m.labelsList.mockReset().mockResolvedValue([]);
    m.clientsCreate.mockReset();
    m.clientsUpdate.mockReset();
    m.clientsDelete.mockReset();
    m.ratesUpsert.mockReset();
    m.ratesDelete.mockReset();
    m.channelsCreate.mockReset();
    m.channelsDelete.mockReset();
    m.channelsTest.mockReset();
    m.intakeSourcesCreate.mockReset();
    m.intakeSourcesDelete.mockReset();
    m.intakeRulesCreate.mockReset();
    m.intakeRulesDelete.mockReset();
    m.usersCreate.mockReset();
    m.usersUpdate.mockReset();
    m.usersInvite.mockReset();
    m.contractsList.mockReset().mockResolvedValue([]);
    m.contractsCreate.mockReset();
    m.contractsUpdate.mockReset();
    m.contractsDelete.mockReset();
    m.periodLocksList.mockReset().mockResolvedValue([]);
    m.periodLocksCreate.mockReset();
    m.periodLocksDelete.mockReset();
    m.kbList.mockReset().mockResolvedValue([]);
    m.kbCreate.mockReset();
    m.kbUpdate.mockReset();
    m.kbDelete.mockReset();
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  // ── ClientsTab: update + delete onError (ApiError → err.message) ───────────────

  it('runs the client UPDATE onError toast when the update rejects (ApiError)', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    m.clientsUpdate.mockRejectedValue(new ApiError(409, null, 'slug taken'));
    renderTab();
    await screen.findByText('Acme Corp');

    await userEvent.click(screen.getByRole('button', { name: 'editar' }));
    const nameField = await screen.findByDisplayValue('Acme Corp');
    await userEvent.clear(nameField);
    await userEvent.type(nameField, 'Renamed');
    await userEvent.click(screen.getByRole('button', { name: 'guardar' }));

    await waitFor(() => expect(m.clientsUpdate).toHaveBeenCalledTimes(1));
    // The row stays open (onError does not close it), proving onError ran.
    expect(screen.getByDisplayValue('Renamed')).toBeInTheDocument();
  });

  it('runs the client DELETE onError toast when the delete rejects (ApiError)', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    m.clientsDelete.mockRejectedValue(new ApiError(409, null, 'in use'));
    renderTab();
    await screen.findByText('Acme Corp');
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    await waitFor(() => expect(m.clientsDelete).toHaveBeenCalledWith('c1'));
  });

  // Mini renders its non-mono (display) variant nowhere in the table, so the
  // value path always uses mono — but the display row already exercises Mini.
  it('renders two clients so alternating row styling + Mini cells are exercised', async () => {
    m.clientsList.mockResolvedValue([
      aClient(),
      aClient({ id: 'c2', name: 'Beta LLC', slug: 'beta', currency: 'USD', notes: '' }),
    ]);
    renderTab();
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
    // currency Plate for the second (USD) client
    expect(screen.getByText(/CLIENTES · CLIENTS · 2/)).toBeInTheDocument();
  });

  // ── RatesTab: missing-map fallbacks + delete onError ──────────────────────────

  it('falls back to raw ids when a rate references a client/project not in the maps', async () => {
    // No clients / projects loaded → clientMap & projectMap are empty.
    m.clientsList.mockResolvedValue([]);
    m.projectsList.mockResolvedValue([]);
    m.ratesList.mockResolvedValue([
      aRate({ id: 'rc', scope: 'client', clientId: 'cX', hourlyCents: 12000 }),
      aRate({ id: 'rp', scope: 'project', projectId: 'pX', hourlyCents: 13000 }),
    ]);
    renderTab('rates');
    await screen.findByText(/TARIFAS · RATES · 2/);
    // rateTarget fallback: client id and project id shown verbatim
    expect(screen.getByText('cX')).toBeInTheDocument();
    expect(screen.getByText('pX')).toBeInTheDocument();
    // rateApplies fallback strings (client / project map miss)
    expect(screen.getByText('todos los proyectos del cliente')).toBeInTheDocument();
    expect(screen.getByText('proyecto específico')).toBeInTheDocument();
  });

  it('runs the rate UPSERT onError with an ApiError message', async () => {
    m.ratesList.mockResolvedValue([]);
    m.ratesUpsert.mockRejectedValue(new ApiError(409, null, 'rate exists'));
    renderTab('rates');
    await screen.findByText(/sin tarifas · no rates yet/);
    await userEvent.click(screen.getByRole('button', { name: '+ Tarifa' }));
    await userEvent.type(screen.getByPlaceholderText('115.00'), '50');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear Tarifa' }));
    // Inline error UI confirms upsertMut.isError → onError ran.
    expect(await screen.findByText('// error · check fields')).toBeInTheDocument();
  });

  it('runs the rate DELETE onError when the delete rejects (ApiError)', async () => {
    m.ratesList.mockResolvedValue([aRate({ id: 'rd', scope: 'default' })]);
    m.ratesDelete.mockRejectedValue(new ApiError(409, null, 'locked'));
    renderTab('rates');
    await screen.findByText(/TARIFAS · RATES · 1/);
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    await waitFor(() => expect(m.ratesDelete).toHaveBeenCalledWith('rd'));
  });

  // ── ChannelsTab: create + delete + test onError ───────────────────────────────

  it('runs the channel CREATE onError with an ApiError message', async () => {
    m.channelsList.mockResolvedValue([]);
    m.channelsCreate.mockRejectedValue(new ApiError(409, null, 'bad url'));
    renderTab('channels');
    await screen.findByText(/sin canales · no channels yet/);
    await userEvent.click(screen.getByRole('button', { name: '+ Canal' }));
    await userEvent.type(screen.getByPlaceholderText('Alertas Slack'), 'Webhook');
    await userEvent.type(
      screen.getByPlaceholderText('https://hooks.slack.com/...'),
      'https://x.test',
    );
    await userEvent.click(screen.getByRole('button', { name: '+ Crear Canal' }));
    expect(await screen.findByText('// error · check fields')).toBeInTheDocument();
  });

  it('runs the channel DELETE onError when the delete rejects (ApiError)', async () => {
    m.channelsList.mockResolvedValue([aChannel()]);
    m.channelsDelete.mockRejectedValue(new ApiError(409, null, 'in use'));
    renderTab('channels');
    await screen.findByText('Alertas Slack');
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    await waitFor(() => expect(m.channelsDelete).toHaveBeenCalledWith('ch1'));
  });

  it('runs the channel TEST onError when the test rejects (ApiError)', async () => {
    m.channelsList.mockResolvedValue([aChannel()]);
    m.channelsTest.mockRejectedValue(new ApiError(409, null, 'unreachable'));
    renderTab('channels');
    await screen.findByText('Alertas Slack');
    await userEvent.click(screen.getByRole('button', { name: 'test' }));
    await waitFor(() => expect(m.channelsTest).toHaveBeenCalledWith('ch1'));
  });

  it('renders two channels (email + inactive) to exercise alternating + kind/status branches', async () => {
    m.channelsList.mockResolvedValue([
      aChannel(),
      aChannel({
        id: 'ch2',
        name: 'Ops Email',
        kind: 'email',
        target: 'ops@example.com',
        active: false,
      }),
    ]);
    renderTab('channels');
    expect(await screen.findByText('Alertas Slack')).toBeInTheDocument();
    expect(screen.getByText('Ops Email')).toBeInTheDocument();
    expect(screen.getByText('inactivo')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
  });

  // ── IntakeTab: create + delete onError, two-source list ───────────────────────

  it('runs the intake-source CREATE onError with an ApiError message', async () => {
    m.intakeSourcesList.mockResolvedValue([]);
    m.projectsList.mockResolvedValue([aProject()]);
    m.intakeSourcesCreate.mockRejectedValue(new ApiError(409, null, 'dup name'));
    renderTab('intake');
    await screen.findByText(/sin fuentes · no intake sources yet/);
    await userEvent.click(screen.getByRole('button', { name: '+ Fuente' }));
    await userEvent.type(screen.getByPlaceholderText('Grafana prod'), 'Src');
    // Pick the project so the submit enables (name + projectId required). The IntakeTab has
    // two project selects (source + auto-assign rule) so 'GIRA · Gira' is ambiguous — take the
    // first (the intake-source form's picker).
    const projectSelect = screen
      .getAllByRole('option', { name: 'GIRA · Gira' })[0]!
      .closest('select')!;
    await userEvent.selectOptions(projectSelect, 'p1');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear Fuente' }));
    expect(await screen.findByText('// error · check fields')).toBeInTheDocument();
  });

  it('runs the intake-source DELETE onError when the delete rejects (ApiError)', async () => {
    m.intakeSourcesList.mockResolvedValue([aSource()]);
    m.projectsList.mockResolvedValue([aProject()]);
    m.intakeSourcesDelete.mockRejectedValue(new ApiError(409, null, 'referenced'));
    renderTab('intake');
    await screen.findByText('Grafana prod');
    // The ✕ delete button is on the source row.
    const delButton = screen.getAllByRole('button').find((b) => b.textContent === '✕')!;
    await userEvent.click(delButton);
    await waitFor(() => expect(m.intakeSourcesDelete).toHaveBeenCalledWith('src1'));
  });

  it('renders two intake sources (active + inactive) to hit alternating row + status', async () => {
    m.intakeSourcesList.mockResolvedValue([
      aSource(),
      aSource({ id: 'src2', name: 'WP hook', kind: 'wordpress', active: false }),
    ]);
    m.projectsList.mockResolvedValue([aProject()]);
    renderTab('intake');
    expect(await screen.findByText('Grafana prod')).toBeInTheDocument();
    expect(screen.getByText('WP hook')).toBeInTheDocument();
    expect(screen.getByText('inactivo')).toBeInTheDocument();
  });

  // ── AssignmentRulesSection: create-with-match-fields + onErrors + 2 rows ───────

  it('creates an assignment rule WITH match type/priority/label (conditional spreads)', async () => {
    m.intakeSourcesList.mockResolvedValue([]);
    m.projectsList.mockResolvedValue([aProject()]);
    m.usersList.mockResolvedValue([aUser()]);
    m.labelsList.mockResolvedValue([{ id: 'l1', name: 'frontend' }]);
    m.intakeRulesList.mockResolvedValue([]);
    m.intakeRulesCreate.mockResolvedValue(aRule());
    renderTab('intake');
    await screen.findByText(/REGLAS DE ASIGNACIÓN/);

    const projectSelect = screen
      .getByRole('option', { name: '— seleccionar proyecto · pick a project —' })
      .closest('select')!;
    await userEvent.selectOptions(projectSelect, 'GIRA');
    await screen.findByText(/sin reglas/);

    await userEvent.click(screen.getByRole('button', { name: '+ Regla' }));
    await screen.findByText('// NUEVA REGLA · NEW ASSIGNMENT RULE');

    await userEvent.selectOptions(
      screen.getByRole('option', { name: 'bug' }).closest('select')!,
      'bug',
    );
    await userEvent.selectOptions(
      screen.getByRole('option', { name: 'high' }).closest('select')!,
      'high',
    );
    await userEvent.selectOptions(
      screen.getByRole('option', { name: 'frontend' }).closest('select')!,
      'l1',
    );
    await userEvent.selectOptions(
      screen.getByRole('option', { name: '— seleccionar usuario —' }).closest('select')!,
      'u1',
    );
    await userEvent.click(screen.getByRole('button', { name: '+ Crear Regla · Create Rule' }));

    await waitFor(() => expect(m.intakeRulesCreate).toHaveBeenCalledTimes(1));
    expect(m.intakeRulesCreate.mock.calls[0]![1]).toMatchObject({
      assigneeId: 'u1',
      matchType: 'bug',
      matchPriority: 'high',
      matchLabelId: 'l1',
    });
  });

  it('runs the assignment-rule CREATE onError with an ApiError message', async () => {
    m.intakeSourcesList.mockResolvedValue([]);
    m.projectsList.mockResolvedValue([aProject()]);
    m.usersList.mockResolvedValue([aUser()]);
    m.intakeRulesList.mockResolvedValue([]);
    m.intakeRulesCreate.mockRejectedValue(new ApiError(409, null, 'rule clash'));
    renderTab('intake');
    await screen.findByText(/REGLAS DE ASIGNACIÓN/);
    await userEvent.selectOptions(
      screen
        .getByRole('option', { name: '— seleccionar proyecto · pick a project —' })
        .closest('select')!,
      'GIRA',
    );
    await screen.findByText(/sin reglas/);
    await userEvent.click(screen.getByRole('button', { name: '+ Regla' }));
    await userEvent.selectOptions(
      screen.getByRole('option', { name: '— seleccionar usuario —' }).closest('select')!,
      'u1',
    );
    await userEvent.click(screen.getByRole('button', { name: '+ Crear Regla · Create Rule' }));
    expect(await screen.findByText('// error · comprueba los campos')).toBeInTheDocument();
  });

  it('runs the assignment-rule DELETE onError when the delete rejects (ApiError)', async () => {
    m.intakeSourcesList.mockResolvedValue([]);
    m.projectsList.mockResolvedValue([aProject()]);
    m.usersList.mockResolvedValue([aUser()]);
    m.intakeRulesList.mockResolvedValue([
      aRule({ id: 'r1', order: 0 }),
      aRule({ id: 'r2', order: 1, matchType: 'bug', matchPriority: 'high', matchLabelId: 'lZ' }),
    ]);
    m.intakeRulesDelete.mockRejectedValue(new ApiError(409, null, 'cannot'));
    renderTab('intake');
    await screen.findByText(/REGLAS DE ASIGNACIÓN/);
    await userEvent.selectOptions(
      screen
        .getByRole('option', { name: '— seleccionar proyecto · pick a project —' })
        .closest('select')!,
      'GIRA',
    );
    // Two rows render → exercises i<len-1 borderBottom + alternating background.
    expect(await screen.findByText('#0')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    // label id with no matching label → labelNameById falls back to the raw id.
    expect(screen.getByText('lZ')).toBeInTheDocument();
    const delButton = screen.getAllByRole('button').find((b) => b.textContent === '✕')!;
    await userEvent.click(delButton);
    await waitFor(() => expect(m.intakeRulesDelete).toHaveBeenCalled());
  });

  // ── TeamTab: create + update + invite onError ─────────────────────────────────

  it('runs the user CREATE onError with an ApiError message', async () => {
    m.usersList.mockResolvedValue([]);
    m.usersCreate.mockRejectedValue(new ApiError(409, null, 'email taken'));
    renderTab('team');
    await screen.findByText(/sin personas/);
    await userEvent.click(screen.getByRole('button', { name: '+ Persona' }));
    await userEvent.type(screen.getByPlaceholderText('persona@ejemplo.com'), 'x@y.test');
    await userEvent.type(screen.getByPlaceholderText('Nombre Apellido'), 'X');
    await userEvent.click(screen.getByRole('button', { name: /Invitar Persona · Add Person/ }));
    expect(await screen.findByText('// error · check fields')).toBeInTheDocument();
  });

  it('runs the user UPDATE onError when a role change rejects (ApiError)', async () => {
    m.usersList.mockResolvedValue([aUser({ role: 'member' })]);
    m.usersUpdate.mockRejectedValue(new ApiError(409, null, 'forbidden'));
    renderTab('team');
    await screen.findByText('Ada Lovelace');
    // The inline role <select> in the row (options: admin/member/viewer); its
    // current value is the user's role 'member'.
    const roleSelect = screen.getByDisplayValue('member');
    await userEvent.selectOptions(roleSelect, 'admin');
    await waitFor(() => expect(m.usersUpdate).toHaveBeenCalledTimes(1));
    expect(m.usersUpdate.mock.calls[0]![1]).toMatchObject({ role: 'admin' });
  });

  it('runs the user INVITE onError when the invite rejects (ApiError)', async () => {
    m.usersList.mockResolvedValue([aUser({ isActive: true })]);
    m.usersInvite.mockRejectedValue(new ApiError(409, null, 'no email'));
    renderTab('team');
    await screen.findByText('Ada Lovelace');
    await userEvent.click(screen.getByRole('button', { name: /Invitar · Invite/ }));
    await waitFor(() => expect(m.usersInvite).toHaveBeenCalledWith('u1'));
  });

  it('reveals the client picker (kind=client) and resolves the client name fallback in the row', async () => {
    m.usersList.mockResolvedValue([
      // client user whose clientId is NOT in clientMap → falls back to the id.
      aUser({ id: 'u9', name: 'Cleo Client', kind: 'client', clientId: 'cMissing' }),
    ]);
    m.clientsList.mockResolvedValue([]);
    renderTab('team');
    expect(await screen.findByText('Cleo Client')).toBeInTheDocument();
    // clientMap miss → raw id rendered under the name.
    expect(screen.getByText('cMissing')).toBeInTheDocument();
  });

  // ── ContractsTab: create-without-money, ended row, status/delete onError ──────

  it('creates a contract WITHOUT retainer/included-hours (null branches)', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    m.contractsList.mockResolvedValue([]);
    m.contractsCreate.mockResolvedValue(aContract({ id: 'k9', name: 'Lean SOW' }));
    renderTab('contracts');
    await screen.findByText(/sin contratos · no contracts yet/);
    await userEvent.click(screen.getByRole('button', { name: '+ Contrato · Contract' }));
    await userEvent.selectOptions(screen.getByLabelText(/cliente · client/), 'c1');
    await userEvent.type(screen.getByLabelText(/nombre · name/), 'Lean SOW');
    // Leave retainer + includedHours empty → the `? : null` falsy branches run.
    await userEvent.click(screen.getByRole('button', { name: /Crear Contrato/ }));
    await waitFor(() => expect(m.contractsCreate).toHaveBeenCalledTimes(1));
    expect(m.contractsCreate.mock.calls[0]![0]).toMatchObject({
      retainerCents: null,
      includedHours: null,
    });
  });

  it('renders an ENDED contract (Reactivar button, ∞ hours, — retainer) and reactivates it', async () => {
    m.clientsList.mockResolvedValue([]); // clientName falls back to the raw id
    m.contractsList.mockResolvedValue([
      aContract({
        id: 'k2',
        name: 'Old SOW',
        clientId: 'cGone',
        status: 'ended',
        retainerCents: null,
        includedHours: null,
      }),
    ]);
    m.contractsUpdate.mockResolvedValue(aContract({ status: 'active' }));
    renderTab('contracts');
    expect(await screen.findByText('Old SOW')).toBeInTheDocument();
    // null retainer → '—', null includedHours → '∞h incl.', client id verbatim.
    expect(
      screen.getByText((t) => t.includes('cGone') && t.includes('—') && t.includes('∞h incl.')),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Reactivar · Reopen/ }));
    await waitFor(() => expect(m.contractsUpdate).toHaveBeenCalledWith('k2', { status: 'active' }));
  });

  it('runs the contract STATUS onError when an end/reopen rejects (ApiError)', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    m.contractsList.mockResolvedValue([aContract()]);
    m.contractsUpdate.mockRejectedValue(new ApiError(409, null, 'locked period'));
    renderTab('contracts');
    await screen.findByText('Retainer 2026');
    await userEvent.click(screen.getByRole('button', { name: /Finalizar · End/ }));
    await waitFor(() => expect(m.contractsUpdate).toHaveBeenCalled());
  });

  it('runs the contract DELETE onError when the delete rejects (ApiError)', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    m.contractsList.mockResolvedValue([aContract()]);
    m.contractsDelete.mockRejectedValue(new ApiError(409, null, 'has invoices'));
    renderTab('contracts');
    await screen.findByText('Retainer 2026');
    await userEvent.click(screen.getByRole('button', { name: /Borrar · Delete/ }));
    await waitFor(() => expect(m.contractsDelete).toHaveBeenCalledWith('k1'));
  });

  it('runs the contract CREATE onError when the create rejects (ApiError)', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    m.contractsList.mockResolvedValue([]);
    m.contractsCreate.mockRejectedValue(new ApiError(409, null, 'dup'));
    renderTab('contracts');
    await screen.findByText(/sin contratos/);
    await userEvent.click(screen.getByRole('button', { name: '+ Contrato · Contract' }));
    await userEvent.selectOptions(screen.getByLabelText(/cliente · client/), 'c1');
    await userEvent.type(screen.getByLabelText(/nombre · name/), 'Dup SOW');
    await userEvent.click(screen.getByRole('button', { name: /Crear Contrato/ }));
    // Inline error span appears once createMut.isError is true.
    expect(await screen.findByText('// error · check fields')).toBeInTheDocument();
  });

  it('shows the contracts loading then error state', async () => {
    m.contractsList.mockRejectedValue(new Error('boom'));
    renderTab('contracts');
    expect(
      await screen.findByText(/error al cargar contratos · failed to load/),
    ).toBeInTheDocument();
  });

  // ── PeriodLocksTab: empty-state branch + lock onError ─────────────────────────

  it('shows the no-locked-months empty state once a client with no locks is picked', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    m.periodLocksList.mockResolvedValue([]);
    renderTab('locks');
    await screen.findByRole('option', { name: 'Acme Corp' });
    await userEvent.selectOptions(screen.getByLabelText(/cliente · client/), 'c1');
    expect(await screen.findByText(/sin meses bloqueados · no locked months/)).toBeInTheDocument();
  });

  it('runs the period-lock CREATE onError when locking rejects (ApiError)', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    m.periodLocksList.mockResolvedValue([]);
    m.periodLocksCreate.mockRejectedValue(new ApiError(409, null, 'already locked'));
    renderTab('locks');
    await screen.findByRole('option', { name: 'Acme Corp' });
    await userEvent.selectOptions(screen.getByLabelText(/cliente · client/), 'c1');
    await screen.findByText(/sin meses bloqueados/);
    fireEvent.change(screen.getByLabelText(/mes · month/), { target: { value: '2026-03' } });
    await userEvent.click(screen.getByRole('button', { name: /Bloquear · Lock/ }));
    await waitFor(() => expect(m.periodLocksCreate).toHaveBeenCalledWith('c1', '2026-03'));
  });

  // ── RunbookTab: empty-state, client-scoped article, create onError, save onError ─

  it('shows the runbook empty state when there are no articles', async () => {
    m.kbList.mockResolvedValue([]);
    renderTab('runbook');
    expect(await screen.findByText(/sin artículos · no articles yet/)).toBeInTheDocument();
  });

  it('renders a client-scoped runbook article (clientId truthy → "cliente · client")', async () => {
    m.kbList.mockResolvedValue([aKb({ id: 'kbC', title: 'Client doc', clientId: 'c1', body: '' })]);
    renderTab('runbook');
    expect(await screen.findByText('Client doc')).toBeInTheDocument();
    expect(screen.getByText(/cliente · client/)).toBeInTheDocument();
  });

  it('runs the runbook CREATE onError when the create rejects (ApiError)', async () => {
    m.kbList.mockResolvedValue([]);
    m.kbCreate.mockRejectedValue(new ApiError(409, null, 'dup title'));
    renderTab('runbook');
    await screen.findByText(/sin artículos/);
    await userEvent.click(screen.getByRole('button', { name: '+ Artículo · Article' }));
    await userEvent.type(screen.getByLabelText(/título · title/), 'Doc');
    await userEvent.click(screen.getByRole('button', { name: /Crear · Create/ }));
    await waitFor(() => expect(m.kbCreate).toHaveBeenCalled());
  });

  it('runs the runbook SAVE onError when the edit rejects (ApiError)', async () => {
    m.kbList.mockResolvedValue([aKb()]);
    m.kbUpdate.mockRejectedValue(new ApiError(409, null, 'conflict'));
    renderTab('runbook');
    await screen.findByText('On-call');
    await userEvent.click(screen.getByRole('button', { name: /Editar · Edit/ }));
    const editArea = screen.getByLabelText(/editar On-call/);
    await userEvent.clear(editArea);
    await userEvent.type(editArea, 'changed');
    await userEvent.click(screen.getByRole('button', { name: /Guardar · Save/ }));
    await waitFor(() => expect(m.kbUpdate).toHaveBeenCalledWith('kb1', { body: 'changed' }));
  });

  it('shows the runbook loading then error state', async () => {
    m.kbList.mockRejectedValue(new Error('boom'));
    renderTab('runbook');
    expect(await screen.findByText(/error al cargar · failed to load/)).toBeInTheDocument();
  });
});
