// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

// All list + mutation fns live on the hoisted `m` so the (hoisted) vi.mock factory
// can close over them and the tests can drive resolve/reject + assert calls.
const m = vi.hoisted(() => ({
  // queries
  clientsList: vi.fn(),
  ratesList: vi.fn(),
  channelsList: vi.fn(),
  intakeSourcesList: vi.fn(),
  intakeRulesList: vi.fn(),
  usersList: vi.fn(),
  projectsList: vi.fn(),
  labelsList: vi.fn(),
  // client mutations
  clientsCreate: vi.fn(),
  clientsUpdate: vi.fn(),
  clientsDelete: vi.fn(),
  // rate mutations
  ratesUpsert: vi.fn(),
  ratesDelete: vi.fn(),
  // channel mutations
  channelsCreate: vi.fn(),
  channelsDelete: vi.fn(),
  channelsTest: vi.fn(),
  // intake source mutations
  intakeSourcesCreate: vi.fn(),
  intakeSourcesDelete: vi.fn(),
  // assignment rule mutations
  intakeRulesCreate: vi.fn(),
  intakeRulesDelete: vi.fn(),
  // user mutations
  usersCreate: vi.fn(),
  usersUpdate: vi.fn(),
  usersInvite: vi.fn(),
  // contracts (R1)
  contractsList: vi.fn(),
  contractsCreate: vi.fn(),
  contractsUpdate: vi.fn(),
  contractsDelete: vi.fn(),
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
  ApiError: class ApiError extends Error {},
}));

// STABLE reference: the page reads me.data.role in render-only logic, but keeping the
// object identity stable avoids any chance of re-render churn flaking the tests.
const meRef = vi.hoisted(() => ({ current: { role: 'admin' } as { role: string } }));
vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: meRef.current }) }));

import { SettingsPage } from '../pages/SettingsPage';

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

describe('SettingsPage', () => {
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
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  // ── Tab routing / shell ──────────────────────────────────────────────────────

  it('renders the Clients tab by default with the page header', async () => {
    renderTab();
    expect(await screen.findByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('CLIENTES & TARIFAS')).toBeInTheDocument();
    expect(screen.getByText('Tarifas')).toBeInTheDocument();
    expect(screen.getByText('Equipo')).toBeInTheDocument();
  });

  it('switches tabs via the subbar (Clients → Rates)', async () => {
    renderTab();
    await screen.findByText('Clientes');
    // The default Clients empty state is shown first.
    expect(await screen.findByText(/sin clientes · no clients yet/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('Tarifas'));
    // Rates table heading appears once the rates tab is active.
    expect(await screen.findByText(/TARIFAS · RATES/)).toBeInTheDocument();
  });

  it('falls back to the Clients tab for an unknown tab param', async () => {
    renderTab('bogus');
    expect(await screen.findByText(/sin clientes · no clients yet/)).toBeInTheDocument();
  });

  // ── ClientsTab ───────────────────────────────────────────────────────────────

  it('shows the Clients loading state then the empty state', async () => {
    let resolve!: (v: unknown) => void;
    m.clientsList.mockReturnValue(new Promise((r) => (resolve = r)));
    renderTab();
    expect(await screen.findByText(/cargando clientes · loading clients/)).toBeInTheDocument();
    resolve([]);
    expect(await screen.findByText(/sin clientes · no clients yet/)).toBeInTheDocument();
  });

  it('shows the Clients error state when the list query rejects', async () => {
    m.clientsList.mockRejectedValue(new Error('boom'));
    renderTab();
    expect(
      await screen.findByText(/error al cargar clientes · failed to load/),
    ).toBeInTheDocument();
  });

  it('lists clients with name, slug and currency', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    renderTab();
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('SLUG · acme')).toBeInTheDocument();
    expect(screen.getByText('a note')).toBeInTheDocument();
    expect(screen.getByText(/CLIENTES · CLIENTS · 1/)).toBeInTheDocument();
  });

  it('creates a client through the new-client form (success)', async () => {
    m.clientsList.mockResolvedValue([]);
    m.clientsCreate.mockResolvedValue(aClient({ name: 'New Co' }));
    renderTab();
    await screen.findByText(/sin clientes/);

    await userEvent.click(screen.getByRole('button', { name: '+ Cliente' }));
    expect(await screen.findByText('// NUEVO CLIENTE · NEW CLIENT')).toBeInTheDocument();

    // Inputs are programmatically labelled (Field/CurrencySelect associate label↔control
    // via htmlFor/id) — so they have an accessible name for screen readers.
    expect(screen.getByLabelText(/nombre · name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/moneda · currency/)).toBeInTheDocument();

    // Create is disabled until name + slug are present.
    const createBtn = screen.getByRole('button', { name: '+ Crear Cliente' });
    expect(createBtn).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Acme Corp'), 'New Co');
    await userEvent.type(screen.getByPlaceholderText('acme'), 'newco');
    // CurrencySelect helper
    const currencySelect = screen.getByDisplayValue('EUR');
    await userEvent.selectOptions(currencySelect, 'USD');
    await userEvent.type(screen.getByPlaceholderText('opcional · optional'), 'hi');

    expect(createBtn).toBeEnabled();
    await userEvent.click(createBtn);

    await waitFor(() => expect(m.clientsCreate).toHaveBeenCalledTimes(1));
    expect(m.clientsCreate.mock.calls[0]![0]).toMatchObject({
      name: 'New Co',
      slug: 'newco',
      currency: 'USD',
      notes: 'hi',
    });
  });

  it('shows the inline create error when the client create mutation rejects', async () => {
    m.clientsList.mockResolvedValue([]);
    m.clientsCreate.mockRejectedValue(new Error('dup slug'));
    renderTab();
    await screen.findByText(/sin clientes/);

    await userEvent.click(screen.getByRole('button', { name: '+ Cliente' }));
    await userEvent.type(screen.getByPlaceholderText('Acme Corp'), 'X');
    await userEvent.type(screen.getByPlaceholderText('acme'), 'x');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear Cliente' }));

    expect(await screen.findByText('// error al crear · create failed')).toBeInTheDocument();
  });

  it('cancels the create-client form', async () => {
    m.clientsList.mockResolvedValue([]);
    renderTab();
    await screen.findByText(/sin clientes/);
    await userEvent.click(screen.getByRole('button', { name: '+ Cliente' }));
    await screen.findByText('// NUEVO CLIENTE · NEW CLIENT');
    await userEvent.click(screen.getByRole('button', { name: /✕ cancelar/ }));
    await waitFor(() =>
      expect(screen.queryByText('// NUEVO CLIENTE · NEW CLIENT')).not.toBeInTheDocument(),
    );
  });

  it('edits a client inline and saves the update', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    m.clientsUpdate.mockResolvedValue(aClient({ name: 'Acme Renamed' }));
    renderTab();
    await screen.findByText('Acme Corp');

    await userEvent.click(screen.getByRole('button', { name: 'editar' }));
    // The edit row seeds the existing name.
    const nameField = await screen.findByDisplayValue('Acme Corp');
    await userEvent.clear(nameField);
    await userEvent.type(nameField, 'Acme Renamed');
    await userEvent.click(screen.getByRole('button', { name: 'guardar' }));

    await waitFor(() => expect(m.clientsUpdate).toHaveBeenCalledTimes(1));
    expect(m.clientsUpdate.mock.calls[0]![0]).toBe('c1');
    expect(m.clientsUpdate.mock.calls[0]![1]).toMatchObject({ name: 'Acme Renamed' });
  });

  it('closes the inline edit row with the ✕ button', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    renderTab();
    await screen.findByText('Acme Corp');
    await userEvent.click(screen.getByRole('button', { name: 'editar' }));
    await screen.findByDisplayValue('Acme Corp');
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    await waitFor(() => expect(screen.queryByDisplayValue('Acme Corp')).not.toBeInTheDocument());
  });

  it('deletes a client after confirm', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    m.clientsDelete.mockResolvedValue(undefined);
    renderTab();
    await screen.findByText('Acme Corp');
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(confirmSpy).toHaveBeenCalledWith('¿Borrar cliente "Acme Corp"?');
    await waitFor(() => expect(m.clientsDelete).toHaveBeenCalledWith('c1'));
  });

  it('does NOT delete a client when confirm is cancelled', async () => {
    confirmSpy.mockReturnValue(false);
    m.clientsList.mockResolvedValue([aClient()]);
    renderTab();
    await screen.findByText('Acme Corp');
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(m.clientsDelete).not.toHaveBeenCalled();
  });

  // ── RatesTab ─────────────────────────────────────────────────────────────────

  it('shows the Rates loading then empty state', async () => {
    let resolve!: (v: unknown) => void;
    m.ratesList.mockReturnValue(new Promise((r) => (resolve = r)));
    renderTab('rates');
    expect(await screen.findByText(/cargando tarifas · loading rates/)).toBeInTheDocument();
    resolve([]);
    expect(await screen.findByText(/sin tarifas · no rates yet/)).toBeInTheDocument();
  });

  it('shows the Rates error state when the rates query rejects', async () => {
    m.ratesList.mockRejectedValue(new Error('boom'));
    renderTab('rates');
    expect(await screen.findByText(/error al cargar tarifas · failed to load/)).toBeInTheDocument();
  });

  it('renders the resolution chain with no rates (invoicing-fails warning)', async () => {
    m.ratesList.mockResolvedValue([]);
    renderTab('rates');
    expect(await screen.findByText(/CADENA DE RESOLUCIÓN · RESOLUTION CHAIN/)).toBeInTheDocument();
    expect(
      screen.getByText(/sin tarifas — la facturación fallará hasta configurar una/),
    ).toBeInTheDocument();
    // Inactive chain nodes show the shadowed label.
    expect(screen.getAllByText(/shadowed · tapado/).length).toBeGreaterThan(0);
  });

  it('renders rates of different scopes (target + applies-to + chain match)', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    m.projectsList.mockResolvedValue([aProject()]);
    m.ratesList.mockResolvedValue([
      aRate({ id: 'rd', scope: 'default', hourlyCents: 10000 }),
      aRate({ id: 'rc', scope: 'client', clientId: 'c1', hourlyCents: 12000 }),
      aRate({ id: 'rp', scope: 'project', projectId: 'p1', hourlyCents: 13000 }),
      aRate({ id: 'ri', scope: 'issue', issueId: 'GIRA-9', hourlyCents: 14000 }),
    ]);
    renderTab('rates');
    expect(await screen.findByText(/TARIFAS · RATES · 4/)).toBeInTheDocument();
    // client scope target resolves to client name
    expect(screen.getByText(/Todos los proyectos de Acme Corp/)).toBeInTheDocument();
    // project scope target resolves to project key · name
    expect(screen.getByText('GIRA · Gira')).toBeInTheDocument();
    // issue scope row is read-only (no editar button on it)
    expect(screen.getByText(/Issue específica \(solo lectura\)/)).toBeInTheDocument();
    expect(screen.getByText(/Todo lo demás · fallback global/)).toBeInTheDocument();
    // chain nodes are all active → MATCH label present
    expect(screen.getAllByText(/MATCH · GANA/).length).toBeGreaterThan(0);
  });

  it('opens the rate form and creates a default-scope rate', async () => {
    m.ratesList.mockResolvedValue([]);
    m.ratesUpsert.mockResolvedValue(aRate());
    renderTab('rates');
    await screen.findByText(/sin tarifas · no rates yet/);

    await userEvent.click(screen.getByRole('button', { name: '+ Tarifa' }));
    expect(await screen.findByText('// NUEVA TARIFA · NEW RATE')).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: '+ Crear Tarifa' });
    expect(submit).toBeDisabled(); // no rate entered yet
    await userEvent.type(screen.getByPlaceholderText('115.00'), '115');
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    await waitFor(() => expect(m.ratesUpsert).toHaveBeenCalledTimes(1));
    expect(m.ratesUpsert.mock.calls[0]![0]).toMatchObject({
      scope: 'default',
      hourlyCents: 11500,
      currency: 'EUR',
    });
  });

  it('creates a client-scoped rate (scope dropdown + target selector)', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    m.ratesList.mockResolvedValue([]);
    m.ratesUpsert.mockResolvedValue(aRate({ scope: 'client', clientId: 'c1' }));
    renderTab('rates');
    await screen.findByText(/sin tarifas · no rates yet/);

    await userEvent.click(screen.getByRole('button', { name: '+ Tarifa' }));
    await screen.findByText('// NUEVA TARIFA · NEW RATE');

    // pick client scope → target selector appears. The scope <select> is the one carrying
    // the "default" option (it captures e.currentTarget.value synchronously, so userEvent is ok).
    const scopeSelect = screen.getByRole('option', { name: 'default' }).closest('select')!;
    await userEvent.selectOptions(scopeSelect, 'client');
    const targetSelect = (
      await screen.findByRole('option', { name: '— seleccionar cliente —' })
    ).closest('select')!;
    // disabled until a client is chosen
    const submit = screen.getByRole('button', { name: '+ Crear Tarifa' });
    await userEvent.type(screen.getByPlaceholderText('115.00'), '90');
    expect(submit).toBeDisabled(); // client not selected yet
    await userEvent.selectOptions(targetSelect, 'c1');
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);

    await waitFor(() => expect(m.ratesUpsert).toHaveBeenCalledTimes(1));
    expect(m.ratesUpsert.mock.calls[0]![0]).toMatchObject({
      scope: 'client',
      clientId: 'c1',
      hourlyCents: 9000,
    });
  });

  it('creates a project-scoped rate', async () => {
    m.projectsList.mockResolvedValue([aProject()]);
    m.ratesList.mockResolvedValue([]);
    m.ratesUpsert.mockResolvedValue(aRate({ scope: 'project', projectId: 'p1' }));
    renderTab('rates');
    await screen.findByText(/sin tarifas · no rates yet/);

    await userEvent.click(screen.getByRole('button', { name: '+ Tarifa' }));
    await screen.findByText('// NUEVA TARIFA · NEW RATE');

    const scopeSelect = screen.getByRole('option', { name: 'default' }).closest('select')!;
    await userEvent.selectOptions(scopeSelect, 'project');
    await userEvent.type(screen.getByPlaceholderText('115.00'), '200');
    const projectSelect = (
      await screen.findByRole('option', { name: '— seleccionar proyecto —' })
    ).closest('select')!;
    await userEvent.selectOptions(projectSelect, 'p1');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear Tarifa' }));

    await waitFor(() => expect(m.ratesUpsert).toHaveBeenCalledTimes(1));
    expect(m.ratesUpsert.mock.calls[0]![0]).toMatchObject({ scope: 'project', projectId: 'p1' });
  });

  it('edits an existing rate (form seeds + label switches to EDIT/Guardar)', async () => {
    m.clientsList.mockResolvedValue([aClient()]);
    m.ratesList.mockResolvedValue([aRate({ id: 'rd', scope: 'default', hourlyCents: 11500 })]);
    m.ratesUpsert.mockResolvedValue(aRate());
    renderTab('rates');
    await screen.findByText(/TARIFAS · RATES · 1/);

    await userEvent.click(screen.getByRole('button', { name: 'editar' }));
    expect(await screen.findByText('// EDITAR TARIFA · EDIT RATE')).toBeInTheDocument();
    expect(screen.getByDisplayValue('115.00')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Tarifa' }));
    await waitFor(() => expect(m.ratesUpsert).toHaveBeenCalledTimes(1));
  });

  it('shows the inline rate error when upsert rejects', async () => {
    m.ratesList.mockResolvedValue([]);
    m.ratesUpsert.mockRejectedValue(new Error('bad'));
    renderTab('rates');
    await screen.findByText(/sin tarifas · no rates yet/);
    await userEvent.click(screen.getByRole('button', { name: '+ Tarifa' }));
    await userEvent.type(screen.getByPlaceholderText('115.00'), '50');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear Tarifa' }));
    expect(await screen.findByText('// error · check fields')).toBeInTheDocument();
  });

  it('deletes a rate after confirm', async () => {
    m.ratesList.mockResolvedValue([aRate({ id: 'rd', scope: 'default' })]);
    m.ratesDelete.mockResolvedValue(undefined);
    renderTab('rates');
    await screen.findByText(/TARIFAS · RATES · 1/);
    // The delete button is the ✕ in the rate row.
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => expect(m.ratesDelete).toHaveBeenCalledWith('rd'));
  });

  it('cancels the rate form', async () => {
    m.ratesList.mockResolvedValue([]);
    renderTab('rates');
    await screen.findByText(/sin tarifas · no rates yet/);
    await userEvent.click(screen.getByRole('button', { name: '+ Tarifa' }));
    await screen.findByText('// NUEVA TARIFA · NEW RATE');
    await userEvent.click(screen.getByRole('button', { name: /✕ cancelar/ }));
    await waitFor(() =>
      expect(screen.queryByText('// NUEVA TARIFA · NEW RATE')).not.toBeInTheDocument(),
    );
  });

  // ── ChannelsTab ──────────────────────────────────────────────────────────────

  it('shows the Channels loading then empty state', async () => {
    let resolve!: (v: unknown) => void;
    m.channelsList.mockReturnValue(new Promise((r) => (resolve = r)));
    renderTab('channels');
    expect(await screen.findByText(/cargando canales · loading channels/)).toBeInTheDocument();
    resolve([]);
    expect(await screen.findByText(/sin canales · no channels yet/)).toBeInTheDocument();
  });

  it('shows the channels error state instead of silently falling through to empty', async () => {
    m.channelsList.mockRejectedValue(new Error('boom'));
    renderTab('channels');
    expect(await screen.findByText(/error al cargar canales · failed to load/)).toBeInTheDocument();
    expect(screen.queryByText(/sin canales · no channels yet/)).not.toBeInTheDocument();
  });

  it('lists channels with kind, events and active dot', async () => {
    m.channelsList.mockResolvedValue([
      aChannel(),
      aChannel({
        id: 'ch2',
        name: 'Email ops',
        kind: 'email',
        target: 'ops@x.com',
        active: false,
        events: ['issue.created'],
      }),
    ]);
    renderTab('channels');
    expect(await screen.findByText('Alertas Slack')).toBeInTheDocument();
    expect(screen.getByText('Email ops')).toBeInTheDocument();
    expect(screen.getByText(/AVISOS · CHANNELS · 2/)).toBeInTheDocument();
    expect(screen.getByText('activo')).toBeInTheDocument();
    expect(screen.getByText('inactivo')).toBeInTheDocument();
  });

  it('creates a channel through the new-channel form', async () => {
    m.channelsList.mockResolvedValue([]);
    m.channelsCreate.mockResolvedValue(aChannel({ name: 'Webhook A' }));
    renderTab('channels');
    await screen.findByText(/sin canales/);

    await userEvent.click(screen.getByRole('button', { name: '+ Canal' }));
    expect(await screen.findByText('// NUEVO CANAL · NEW CHANNEL')).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: '+ Crear Canal' });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText('Alertas Slack'), 'Webhook A');
    await userEvent.type(
      screen.getByPlaceholderText('https://hooks.slack.com/...'),
      'https://x.test/h',
    );
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    await waitFor(() => expect(m.channelsCreate).toHaveBeenCalledTimes(1));
    expect(m.channelsCreate.mock.calls[0]![0]).toMatchObject({
      name: 'Webhook A',
      kind: 'webhook',
      target: 'https://x.test/h',
    });
  });

  it('switches the channel kind to email (placeholder changes)', async () => {
    m.channelsList.mockResolvedValue([]);
    renderTab('channels');
    await screen.findByText(/sin canales/);
    await userEvent.click(screen.getByRole('button', { name: '+ Canal' }));
    await screen.findByText('// NUEVO CANAL · NEW CHANNEL');

    const kindSelect = screen.getByDisplayValue('webhook');
    await userEvent.selectOptions(kindSelect, 'email');
    expect(await screen.findByPlaceholderText('ops@example.com')).toBeInTheDocument();
  });

  it('shows the inline channel error when create rejects', async () => {
    m.channelsList.mockResolvedValue([]);
    m.channelsCreate.mockRejectedValue(new Error('bad url'));
    renderTab('channels');
    await screen.findByText(/sin canales/);
    await userEvent.click(screen.getByRole('button', { name: '+ Canal' }));
    await userEvent.type(screen.getByPlaceholderText('Alertas Slack'), 'X');
    await userEvent.type(screen.getByPlaceholderText('https://hooks.slack.com/...'), 'bad');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear Canal' }));
    expect(await screen.findByText('// error · check fields')).toBeInTheDocument();
  });

  it('tests a channel and shows the OK result', async () => {
    m.channelsList.mockResolvedValue([aChannel()]);
    m.channelsTest.mockResolvedValue({ ok: true });
    renderTab('channels');
    await screen.findByText('Alertas Slack');
    await userEvent.click(screen.getByRole('button', { name: 'test' }));
    await waitFor(() => expect(m.channelsTest).toHaveBeenCalledWith('ch1'));
    expect(await screen.findByText('OK')).toBeInTheDocument();
  });

  it('tests a channel and shows the failure result text', async () => {
    m.channelsList.mockResolvedValue([aChannel()]);
    m.channelsTest.mockResolvedValue({ ok: false, error: 'timeout' });
    renderTab('channels');
    await screen.findByText('Alertas Slack');
    await userEvent.click(screen.getByRole('button', { name: 'test' }));
    await waitFor(() => expect(m.channelsTest).toHaveBeenCalledWith('ch1'));
    expect(await screen.findByText('timeout')).toBeInTheDocument();
  });

  it('deletes a channel after confirm', async () => {
    m.channelsList.mockResolvedValue([aChannel()]);
    m.channelsDelete.mockResolvedValue(undefined);
    renderTab('channels');
    await screen.findByText('Alertas Slack');
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(confirmSpy).toHaveBeenCalledWith('¿Borrar canal "Alertas Slack"?');
    await waitFor(() => expect(m.channelsDelete).toHaveBeenCalledWith('ch1'));
  });

  it('cancels the channel form', async () => {
    m.channelsList.mockResolvedValue([]);
    renderTab('channels');
    await screen.findByText(/sin canales/);
    await userEvent.click(screen.getByRole('button', { name: '+ Canal' }));
    await screen.findByText('// NUEVO CANAL · NEW CHANNEL');
    await userEvent.click(screen.getByRole('button', { name: /✕ cancelar/ }));
    await waitFor(() =>
      expect(screen.queryByText('// NUEVO CANAL · NEW CHANNEL')).not.toBeInTheDocument(),
    );
  });

  // ── IntakeTab ────────────────────────────────────────────────────────────────

  it('shows the Intake loading then empty state', async () => {
    let resolve!: (v: unknown) => void;
    m.intakeSourcesList.mockReturnValue(new Promise((r) => (resolve = r)));
    renderTab('intake');
    expect(await screen.findByText(/cargando fuentes · loading sources/)).toBeInTheDocument();
    resolve([]);
    expect(await screen.findByText(/sin fuentes · no intake sources yet/)).toBeInTheDocument();
  });

  it('shows the intake-sources error state instead of silently falling through to empty', async () => {
    m.intakeSourcesList.mockRejectedValue(new Error('boom'));
    renderTab('intake');
    expect(await screen.findByText(/error al cargar fuentes · failed to load/)).toBeInTheDocument();
    expect(screen.queryByText(/sin fuentes · no intake sources yet/)).not.toBeInTheDocument();
  });

  it('lists intake sources with kind, type and priority', async () => {
    m.intakeSourcesList.mockResolvedValue([aSource()]);
    renderTab('intake');
    expect(await screen.findByText('Grafana prod')).toBeInTheDocument();
    expect(screen.getByText(/INTEGRACIONES · INTAKE SOURCES · 1/)).toBeInTheDocument();
    expect(screen.getByText('project: p1')).toBeInTheDocument();
  });

  it('creates an intake source and reveals the one-time token', async () => {
    m.intakeSourcesList.mockResolvedValue([]);
    m.projectsList.mockResolvedValue([aProject()]);
    m.intakeSourcesCreate.mockResolvedValue({
      ...aSource({ name: 'New src' }),
      token: 'secrettoken123',
      intakeUrl: 'https://gira.test/intake/abc',
    });
    renderTab('intake');
    await screen.findByText(/sin fuentes/);

    await userEvent.click(screen.getByRole('button', { name: '+ Fuente' }));
    expect(await screen.findByText('// NUEVA FUENTE · NEW INTAKE SOURCE')).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: '+ Crear Fuente' });
    expect(submit).toBeDisabled(); // needs name + project
    await userEvent.type(screen.getByPlaceholderText('Grafana prod'), 'New src');
    // The intake create form's project <select> is the one with the "— seleccionar —" option
    // (the assignment-rules selector uses a different placeholder option).
    const projectSelect = screen
      .getByRole('option', { name: '— seleccionar —' })
      .closest('select')!;
    await userEvent.selectOptions(projectSelect, 'p1');
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    await waitFor(() => expect(m.intakeSourcesCreate).toHaveBeenCalledTimes(1));
    expect(m.intakeSourcesCreate.mock.calls[0]![0]).toMatchObject({
      name: 'New src',
      projectId: 'p1',
    });
    // One-time token reveal
    expect(await screen.findByText('secrettoken123')).toBeInTheDocument();
    expect(screen.getByText(/INTAKE URL: https:\/\/gira.test\/intake\/abc/)).toBeInTheDocument();
    // Dismiss it.
    await userEvent.click(screen.getByRole('button', { name: /Entendido · Got it/ }));
    await waitFor(() => expect(screen.queryByText('secrettoken123')).not.toBeInTheDocument());
  });

  it('shows the inline intake error when create rejects', async () => {
    m.intakeSourcesList.mockResolvedValue([]);
    m.projectsList.mockResolvedValue([aProject()]);
    m.intakeSourcesCreate.mockRejectedValue(new Error('bad'));
    renderTab('intake');
    await screen.findByText(/sin fuentes/);
    await userEvent.click(screen.getByRole('button', { name: '+ Fuente' }));
    await userEvent.type(screen.getByPlaceholderText('Grafana prod'), 'X');
    const projectSelect = screen
      .getByRole('option', { name: '— seleccionar —' })
      .closest('select')!;
    await userEvent.selectOptions(projectSelect, 'p1');
    await userEvent.click(screen.getByRole('button', { name: '+ Crear Fuente' }));
    expect(await screen.findByText('// error · check fields')).toBeInTheDocument();
  });

  it('deletes an intake source after confirm', async () => {
    m.intakeSourcesList.mockResolvedValue([aSource()]);
    m.intakeSourcesDelete.mockResolvedValue(undefined);
    renderTab('intake');
    await screen.findByText('Grafana prod');
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(confirmSpy).toHaveBeenCalledWith('¿Borrar fuente "Grafana prod"?');
    await waitFor(() => expect(m.intakeSourcesDelete).toHaveBeenCalledWith('src1'));
  });

  it('cancels the intake source form', async () => {
    m.intakeSourcesList.mockResolvedValue([]);
    renderTab('intake');
    await screen.findByText(/sin fuentes/);
    await userEvent.click(screen.getByRole('button', { name: '+ Fuente' }));
    await screen.findByText('// NUEVA FUENTE · NEW INTAKE SOURCE');
    await userEvent.click(screen.getByRole('button', { name: /✕ cancelar/ }));
    await waitFor(() =>
      expect(screen.queryByText('// NUEVA FUENTE · NEW INTAKE SOURCE')).not.toBeInTheDocument(),
    );
  });

  // ── AssignmentRulesSection (inside IntakeTab) ─────────────────────────────────

  it('loads assignment rules for the selected project and shows the empty state', async () => {
    m.intakeSourcesList.mockResolvedValue([]);
    m.projectsList.mockResolvedValue([aProject()]);
    m.intakeRulesList.mockResolvedValue([]);
    renderTab('intake');
    await screen.findByText(/REGLAS DE ASIGNACIÓN · ASSIGNMENT RULES/);

    // pick the project in the assignment-rules project selector
    const projectSelect = screen
      .getByRole('option', { name: '— seleccionar proyecto · pick a project —' })
      .closest('select')!;
    await userEvent.selectOptions(projectSelect, 'GIRA');
    await waitFor(() => expect(m.intakeRulesList).toHaveBeenCalledWith('GIRA'));
    expect(await screen.findByText(/sin reglas · no assignment rules/)).toBeInTheDocument();
  });

  it('creates an assignment rule for the selected project', async () => {
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
    expect(await screen.findByText('// NUEVA REGLA · NEW ASSIGNMENT RULE')).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: '+ Crear Regla · Create Rule' });
    expect(submit).toBeDisabled(); // assignee required

    const assigneeSelect = screen
      .getByRole('option', { name: '— seleccionar usuario —' })
      .closest('select')!;
    await userEvent.selectOptions(assigneeSelect, 'u1');
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    await waitFor(() => expect(m.intakeRulesCreate).toHaveBeenCalledTimes(1));
    expect(m.intakeRulesCreate.mock.calls[0]![0]).toBe('GIRA');
    expect(m.intakeRulesCreate.mock.calls[0]![1]).toMatchObject({ assigneeId: 'u1', order: 0 });
  });

  it('renders an existing assignment rule resolving the assignee name', async () => {
    m.intakeSourcesList.mockResolvedValue([]);
    m.projectsList.mockResolvedValue([aProject()]);
    m.usersList.mockResolvedValue([aUser({ id: 'u1', name: 'Ada Lovelace' })]);
    m.labelsList.mockResolvedValue([{ id: 'l1', name: 'frontend' }]);
    m.intakeRulesList.mockResolvedValue([
      aRule({
        id: 'rl1',
        matchType: 'bug',
        matchPriority: 'high',
        matchLabelId: 'l1',
        assigneeId: 'u1',
        order: 2,
      }),
    ]);
    m.intakeRulesDelete.mockResolvedValue(undefined);
    renderTab('intake');
    await screen.findByText(/REGLAS DE ASIGNACIÓN/);
    const projectSelect = screen
      .getByRole('option', { name: '— seleccionar proyecto · pick a project —' })
      .closest('select')!;
    await userEvent.selectOptions(projectSelect, 'GIRA');

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument(); // label name resolved

    // Delete the rule (the ✕ in the rule row).
    const ruleRowDelete = screen.getAllByRole('button').find((b) => b.textContent === '✕')!;
    await userEvent.click(ruleRowDelete);
    expect(confirmSpy).toHaveBeenCalledWith(
      '¿Borrar esta regla de asignación? · Delete this assignment rule?',
    );
    await waitFor(() => expect(m.intakeRulesDelete).toHaveBeenCalledWith('rl1'));
  });

  it('hides assignment-rule write controls for a viewer', async () => {
    meRef.current = { role: 'viewer' };
    m.intakeSourcesList.mockResolvedValue([]);
    m.projectsList.mockResolvedValue([aProject()]);
    m.intakeRulesList.mockResolvedValue([]);
    renderTab('intake');
    await screen.findByText(/REGLAS DE ASIGNACIÓN/);
    const projectSelect = screen
      .getByRole('option', { name: '— seleccionar proyecto · pick a project —' })
      .closest('select')!;
    await userEvent.selectOptions(projectSelect, 'GIRA');
    await screen.findByText(/sin reglas/);
    // viewer cannot write → no "+ Regla" button
    expect(screen.queryByRole('button', { name: '+ Regla' })).not.toBeInTheDocument();
  });

  // ── TeamTab ──────────────────────────────────────────────────────────────────

  it('shows the Team loading then empty state', async () => {
    let resolve!: (v: unknown) => void;
    m.usersList.mockReturnValue(new Promise((r) => (resolve = r)));
    renderTab('team');
    expect(await screen.findByText(/cargando personas · loading users/)).toBeInTheDocument();
    resolve([]);
    expect(await screen.findByText(/sin personas · no users yet/)).toBeInTheDocument();
  });

  it('shows the Team error state when the users query rejects', async () => {
    m.usersList.mockRejectedValue(new Error('boom'));
    renderTab('team');
    expect(
      await screen.findByText(/error al cargar personas · failed to load/),
    ).toBeInTheDocument();
  });

  it('lists users with name, email, kind badge and status', async () => {
    m.usersList.mockResolvedValue([
      aUser(),
      aUser({
        id: 'u2',
        name: 'Bob Client',
        email: 'bob@c.com',
        kind: 'client',
        clientId: 'c1',
        isActive: false,
      }),
    ]);
    m.clientsList.mockResolvedValue([aClient()]);
    renderTab('team');
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('bob@c.com')).toBeInTheDocument();
    expect(screen.getByText(/EQUIPO · TEAM · 2/)).toBeInTheDocument();
    expect(screen.getByText('activa')).toBeInTheDocument();
    expect(screen.getByText('inact.')).toBeInTheDocument();
    // client user shows the resolved client name under the name
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('creates a staff user through the invite form', async () => {
    m.usersList.mockResolvedValue([]);
    m.usersCreate.mockResolvedValue(aUser({ name: 'New Person' }));
    renderTab('team');
    await screen.findByText(/sin personas/);

    await userEvent.click(screen.getByRole('button', { name: '+ Persona' }));
    expect(await screen.findByText('// INVITAR PERSONA · ADD PERSON')).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: /Invitar Persona · Add Person/ });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText('persona@ejemplo.com'), 'new@x.com');
    await userEvent.type(screen.getByPlaceholderText('Nombre Apellido'), 'New Person');
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    await waitFor(() => expect(m.usersCreate).toHaveBeenCalledTimes(1));
    expect(m.usersCreate.mock.calls[0]![0]).toMatchObject({
      email: 'new@x.com',
      name: 'New Person',
      kind: 'staff',
      role: 'member',
    });
  });

  it('switches the invite kind from staff to client and reveals the required client picker', async () => {
    // Regression guard for the fixed kind-select crash: the kind <select> now captures
    // e.currentTarget.value synchronously, so switching to "client" under a live query no
    // longer nulls currentTarget and crashes — the conditional client picker renders.
    m.usersList.mockResolvedValue([]);
    m.clientsList.mockResolvedValue([aClient()]);
    renderTab('team');
    await screen.findByText(/sin personas/);

    await userEvent.click(screen.getByRole('button', { name: '+ Persona' }));
    await screen.findByText('// INVITAR PERSONA · ADD PERSON');

    // Defaults to staff → the required client picker is hidden.
    expect(screen.getByDisplayValue('staff · equipo')).toBeInTheDocument();
    expect(
      screen.queryByText(/cliente · client \(obligatorio · required\)/),
    ).not.toBeInTheDocument();

    // Switch to client → the picker appears (and is required).
    await userEvent.selectOptions(screen.getByDisplayValue('staff · equipo'), 'client');
    expect(
      await screen.findByText(/cliente · client \(obligatorio · required\)/),
    ).toBeInTheDocument();

    // Switch back to staff → it hides again.
    await userEvent.selectOptions(screen.getByDisplayValue('client · cliente'), 'staff');
    expect(
      screen.queryByText(/cliente · client \(obligatorio · required\)/),
    ).not.toBeInTheDocument();
  });

  it('shows the inline user create error when create rejects', async () => {
    m.usersList.mockResolvedValue([]);
    m.usersCreate.mockRejectedValue(new Error('dup email'));
    renderTab('team');
    await screen.findByText(/sin personas/);
    await userEvent.click(screen.getByRole('button', { name: '+ Persona' }));
    await userEvent.type(screen.getByPlaceholderText('persona@ejemplo.com'), 'x@x.com');
    await userEvent.type(screen.getByPlaceholderText('Nombre Apellido'), 'X');
    await userEvent.click(screen.getByRole('button', { name: /Invitar Persona · Add Person/ }));
    expect(await screen.findByText('// error · check fields')).toBeInTheDocument();
  });

  it('changes a user role from the inline role select', async () => {
    m.usersList.mockResolvedValue([aUser({ role: 'member' })]);
    m.usersUpdate.mockResolvedValue(aUser({ role: 'admin' }));
    renderTab('team');
    await screen.findByText('Ada Lovelace');
    // The inline role select (in the row) has the current value "member".
    const roleSelect = screen.getByDisplayValue('member');
    await userEvent.selectOptions(roleSelect, 'admin');
    await waitFor(() => expect(m.usersUpdate).toHaveBeenCalledTimes(1));
    expect(m.usersUpdate.mock.calls[0]![1]).toMatchObject({ role: 'admin' });
  });

  it('deactivates an active user', async () => {
    m.usersList.mockResolvedValue([aUser({ isActive: true })]);
    m.usersUpdate.mockResolvedValue(aUser({ isActive: false }));
    renderTab('team');
    await screen.findByText('Ada Lovelace');
    await userEvent.click(screen.getByRole('button', { name: /Desact\. · Deactivate/ }));
    await waitFor(() => expect(m.usersUpdate).toHaveBeenCalledTimes(1));
    expect(m.usersUpdate.mock.calls[0]![1]).toMatchObject({ isActive: false });
  });

  it('activates an inactive user (and hides Invite for inactive)', async () => {
    m.usersList.mockResolvedValue([aUser({ isActive: false })]);
    m.usersUpdate.mockResolvedValue(aUser({ isActive: true }));
    renderTab('team');
    await screen.findByText('Ada Lovelace');
    // Inactive users have no Invite button.
    expect(screen.queryByRole('button', { name: /Invitar · Invite/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Activar · Activate/ }));
    await waitFor(() => expect(m.usersUpdate).toHaveBeenCalledTimes(1));
    expect(m.usersUpdate.mock.calls[0]![1]).toMatchObject({ isActive: true });
  });

  it('sends a magic-link invite for an active user', async () => {
    m.usersList.mockResolvedValue([aUser({ isActive: true })]);
    m.usersInvite.mockResolvedValue(undefined);
    renderTab('team');
    await screen.findByText('Ada Lovelace');
    await userEvent.click(screen.getByRole('button', { name: /Invitar · Invite/ }));
    await waitFor(() => expect(m.usersInvite).toHaveBeenCalledWith('u1'));
  });

  it('hides team write controls and shows the admin-only notice for a member', async () => {
    meRef.current = { role: 'member' };
    m.usersList.mockResolvedValue([aUser()]);
    renderTab('team');
    await screen.findByText('Ada Lovelace');
    expect(
      screen.getByText(/Solo admins gestionan el equipo · Only admins manage the team/),
    ).toBeInTheDocument();
    // member sees plain-text role, not the inline select, and no + Persona button
    expect(screen.queryByRole('button', { name: '+ Persona' })).not.toBeInTheDocument();
    const row = screen.getByText('Ada Lovelace').closest('div')!.parentElement!;
    expect(within(row).queryByDisplayValue('member')).not.toBeInTheDocument();
  });

  it('cancels the invite-person form', async () => {
    m.usersList.mockResolvedValue([]);
    renderTab('team');
    await screen.findByText(/sin personas/);
    await userEvent.click(screen.getByRole('button', { name: '+ Persona' }));
    await screen.findByText('// INVITAR PERSONA · ADD PERSON');
    await userEvent.click(screen.getByRole('button', { name: /✕ cancelar/ }));
    await waitFor(() =>
      expect(screen.queryByText('// INVITAR PERSONA · ADD PERSON')).not.toBeInTheDocument(),
    );
  });

  // ── ContractsTab (R1) ──────────────────────────────────────────────────────────
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

  it('lists contracts and shows the empty state', async () => {
    m.contractsList.mockResolvedValue([]);
    renderTab('contracts');
    expect(await screen.findByText(/sin contratos · no contracts yet/)).toBeInTheDocument();
  });

  it('creates, ends, and deletes a contract', async () => {
    m.clientsList.mockResolvedValue([aClient()]); // c1 / Acme Corp
    m.contractsList.mockResolvedValue([aContract()]);
    m.contractsCreate.mockResolvedValue(aContract({ id: 'k2', name: 'New SOW' }));
    m.contractsUpdate.mockResolvedValue(aContract({ status: 'ended' }));
    m.contractsDelete.mockResolvedValue(undefined);
    renderTab('contracts');

    // Existing contract row renders (name + client).
    expect(await screen.findByText('Retainer 2026')).toBeInTheDocument();
    expect(
      screen.getByText((t) => t.includes('Acme Corp') && t.includes('40h incl.')),
    ).toBeInTheDocument();

    // Create: open the form, fill it (labels are real htmlFor associations), submit.
    await userEvent.click(screen.getByRole('button', { name: '+ Contrato · Contract' }));
    await userEvent.selectOptions(screen.getByLabelText(/cliente · client/), 'c1');
    await userEvent.type(screen.getByLabelText(/nombre · name/), 'New SOW');
    await userEvent.type(screen.getByLabelText(/cuota fija/), '5000');
    await userEvent.type(screen.getByLabelText(/horas incluidas/), '40');
    await userEvent.click(screen.getByRole('button', { name: /Crear Contrato/ }));
    await waitFor(() => expect(m.contractsCreate).toHaveBeenCalled());
    expect(m.contractsCreate.mock.calls[0]![0]).toMatchObject({
      clientId: 'c1',
      name: 'New SOW',
      retainerCents: 500_000,
      includedHours: 40,
      status: 'active',
    });

    // End the active contract.
    await userEvent.click(screen.getByRole('button', { name: /Finalizar · End/ }));
    await waitFor(() => expect(m.contractsUpdate).toHaveBeenCalledWith('k1', { status: 'ended' }));

    // Delete (window.confirm is stubbed true).
    await userEvent.click(screen.getByRole('button', { name: /Borrar · Delete/ }));
    await waitFor(() => expect(m.contractsDelete).toHaveBeenCalledWith('k1'));
  });
});
