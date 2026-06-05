// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IssueView } from '@gira/shared';
import { renderWithProviders } from './render';

const h = vi.hoisted(() => ({
  get: vi.fn(),
  cost: vi.fn(),
  sla: vi.fn(),
  events: vi.fn(),
  attachmentsList: vi.fn(),
  attachmentsUpload: vi.fn(),
  attachmentsDelete: vi.fn(),
  commentsList: vi.fn(),
  mentionable: vi.fn(),
  worklogsList: vi.fn(),
  statusesList: vi.fn(),
  labelsList: vi.fn(),
  usersList: vi.fn(),
  auditList: vi.fn(),
  commentsCreate: vi.fn(),
  update: vi.fn(),
  move: vi.fn(),
  worklogsCreate: vi.fn(),
  worklogsUpdate: vi.fn(),
  worklogsDelete: vi.fn(),
}));

// Mutable timer state so individual tests can drive a running/stopped timer and
// assert on the start/stop mutate calls.
const t = vi.hoisted(() => ({
  activeData: null as null | {
    issueKey: string;
    elapsedMinutes: number;
    startedAt: string;
  },
  startMutate: vi.fn(),
  stopMutate: vi.fn(),
  startPending: false,
  stopPending: false,
}));

vi.mock('../api/client', () => ({
  issues: {
    get: (k: string) => h.get(k),
    cost: (k: string) => h.cost(k),
    sla: (k: string) => h.sla(k),
    events: (k: string) => h.events(k),
    update: (k: string, d: unknown) => h.update(k, d),
    move: (k: string, d: unknown) => h.move(k, d),
    comments: {
      list: (k: string) => h.commentsList(k),
      create: (k: string, b: unknown) => h.commentsCreate(k, b),
    },
    mentionable: (k: string) => h.mentionable(k),
    worklogs: {
      list: (k: string) => h.worklogsList(k),
      create: (k: string, d: unknown) => h.worklogsCreate(k, d),
      update: (id: string, d: unknown) => h.worklogsUpdate(id, d),
      delete: (id: string) => h.worklogsDelete(id),
    },
    attachments: {
      list: (k: string) => h.attachmentsList(k),
      upload: (k: string, b: unknown) => h.attachmentsUpload(k, b),
    },
  },
  attachments: {
    delete: (id: string) => h.attachmentsDelete(id),
    url: (id: string) => `/attachments/${id}`,
  },
  projects: {
    statuses: { list: (k: string) => h.statusesList(k) },
    labels: { list: (k: string) => h.labelsList(k) },
  },
  users: { list: () => h.usersList() },
  audit: { list: (p: unknown) => h.auditList(p) },
  ApiError: class ApiError extends Error {},
}));

vi.mock('../hooks/useTimer', () => ({
  useActiveTimer: () => ({ data: t.activeData }),
  useStartTimer: () => ({ mutate: t.startMutate, isPending: t.startPending }),
  useStopTimer: () => ({ mutate: t.stopMutate, isPending: t.stopPending }),
}));

import { IssueDrawer } from '../ui/IssueDrawer';

const issue = (over: Partial<IssueView>): IssueView =>
  ({
    id: 'issue-cuid-0001',
    key: 'GIRA-1',
    title: 'My issue title',
    description: 'A description of the work',
    type: 'task',
    priority: 'medium',
    statusId: 's1',
    statusCategory: 'todo',
    status: { id: 's1', name: 'Backlog', category: 'todo', order: 0 },
    labels: [],
    assignee: null,
    reporter: { id: 'u1', name: 'Reporter' },
    resolution: null,
    severity: null,
    moscow: null,
    blockedReason: null,
    storyPoints: null,
    estimateMinutes: null,
    dueAt: null,
    billingMode: 'hourly',
    fixedPriceCents: null,
    loggedMinutes: 0,
    sprintId: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
    ...over,
  }) as unknown as IssueView;

const renderDrawer = (props?: { issueKey?: string; projectKey?: string; onClose?: () => void }) =>
  renderWithProviders(
    <IssueDrawer
      issueKey={props?.issueKey ?? 'GIRA-1'}
      projectKey={props?.projectKey ?? 'PRJ'}
      onClose={props?.onClose ?? vi.fn()}
    />,
  );

describe('IssueDrawer', () => {
  beforeEach(() => {
    h.get.mockReset().mockResolvedValue(issue({}));
    h.cost.mockReset().mockResolvedValue({
      minutes: 60,
      billableMinutes: 60,
      hourlyCents: 6000,
      accruedCents: 6000,
      currency: 'EUR',
      billingMode: 'hourly',
    });
    h.sla.mockReset().mockResolvedValue({
      issueKey: 'GIRA-1',
      businessTimeZone: 'Europe/Madrid',
      response: { targetMinutes: 480, elapsedMinutes: 120, met: true, breached: false },
      resolution: { targetMinutes: 2400, elapsedMinutes: 3000, met: false, breached: true },
    });
    h.events.mockReset().mockResolvedValue([]);
    h.attachmentsList.mockReset().mockResolvedValue([]);
    h.attachmentsUpload.mockReset().mockResolvedValue({});
    h.attachmentsDelete.mockReset().mockResolvedValue(undefined);
    h.commentsList.mockReset().mockResolvedValue([]);
    h.mentionable.mockReset().mockResolvedValue([]);
    h.worklogsList.mockReset().mockResolvedValue([]);
    h.statusesList
      .mockReset()
      .mockResolvedValue([{ id: 's1', name: 'Backlog', category: 'todo', order: 0 }]);
    h.labelsList.mockReset().mockResolvedValue([]);
    h.usersList.mockReset().mockResolvedValue([]);
    h.auditList.mockReset().mockResolvedValue({ count: 0, entries: [] });
    h.commentsCreate.mockReset();
    h.update.mockReset();
    h.move.mockReset();
    h.worklogsCreate.mockReset();
    h.worklogsUpdate.mockReset();
    h.worklogsDelete.mockReset();
    // Reset the timer mock state to "stopped" by default.
    t.activeData = null;
    t.startMutate.mockReset();
    t.stopMutate.mockReset();
    t.startPending = false;
    t.stopPending = false;
  });

  // ── Load / loading / error ───────────────────────────────────────────────

  it('loads and renders the issue (title + key) in the details tab', async () => {
    h.get.mockResolvedValue(issue({ key: 'GIRA-1', title: 'My issue title' }));
    renderDrawer();

    expect(await screen.findByText('My issue title')).toBeInTheDocument();
    expect(screen.getByText('GIRA-1')).toBeInTheDocument();
    expect(h.get).toHaveBeenCalledWith('GIRA-1');
  });

  it('shows the SLA breach clock in the sidebar (B2)', async () => {
    renderDrawer();
    // Response is met within target (✓); resolution overran its target (breached ⚠).
    expect(await screen.findByText(/respuesta · response/)).toBeInTheDocument();
    expect(screen.getByText(/2h \/ 8h/)).toBeInTheDocument();
    expect(screen.getByText(/50h \/ 40h/)).toBeInTheDocument();
    expect(h.sla).toHaveBeenCalledWith('GIRA-1');
  });

  it('lists, uploads, and downloads attachments in the details tab (N2)', async () => {
    h.attachmentsList.mockResolvedValue([
      {
        id: 'a1',
        issueId: 'i1',
        filename: 'doc.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2048,
        uploadedById: 'u1',
        createdAt: '2026-06-01T00:00:00Z',
      },
    ]);
    renderDrawer();

    // Existing attachment renders with a download link + size.
    const link = await screen.findByRole('link', { name: 'doc.pdf' });
    expect(link).toHaveAttribute('href', '/attachments/a1');
    expect(screen.getByText('2 KiB')).toBeInTheDocument();

    // Upload a small text file → base64'd and posted.
    const file = new File(['hi'], 'note.txt', { type: 'text/plain' });
    await userEvent.upload(screen.getByLabelText(/Subir adjunto · upload/), file);
    await waitFor(() => expect(h.attachmentsUpload).toHaveBeenCalled());
    expect(h.attachmentsUpload.mock.calls[0]![0]).toBe('GIRA-1');
    expect(h.attachmentsUpload.mock.calls[0]![1]).toMatchObject({
      filename: 'note.txt',
      dataBase64: 'aGk=',
    });
  });

  it('shows the transition ledger timeline in the sidebar (A1)', async () => {
    h.events.mockResolvedValue([
      {
        id: 'e1',
        issueId: 'i1',
        kind: 'created',
        fromStatusId: null,
        toStatusId: 's1',
        statusCategory: 'todo',
        actorId: 'u1',
        createdAt: '2026-06-01T09:00:00Z',
      },
      {
        id: 'e2',
        issueId: 'i1',
        kind: 'status_changed',
        fromStatusId: 's1',
        toStatusId: 's2',
        statusCategory: 'done',
        actorId: 'u1',
        createdAt: '2026-06-02T09:00:00Z',
      },
      {
        id: 'e3',
        issueId: 'i1',
        kind: 'reopened',
        fromStatusId: 's2',
        toStatusId: 's1',
        statusCategory: 'todo',
        actorId: 'u1',
        createdAt: '2026-06-03T09:00:00Z',
      },
    ]);
    renderDrawer();
    expect(await screen.findByText(/creada · created → todo/)).toBeInTheDocument();
    expect(screen.getByText(/movida · moved → done/)).toBeInTheDocument();
    expect(screen.getByText(/reabierta · reopened → todo/)).toBeInTheDocument();
    expect(h.events).toHaveBeenCalledWith('GIRA-1');
  });

  it('shows the error state when the issue fails to load', async () => {
    // Mirror the existing passing error-state pattern: queryCache.onError owns the
    // rejection so it never surfaces as an unhandled rejection.
    h.get.mockImplementation(() => Promise.reject(new Error('boom')));
    renderDrawer();

    expect(await screen.findByText(/Could not load issue/)).toBeInTheDocument();
  });

  // ── Title editing ────────────────────────────────────────────────────────

  it('edits the title and saves it via Enter', async () => {
    h.get.mockResolvedValue(issue({ title: 'Old title' }));
    h.update.mockResolvedValue(issue({ title: 'New title' }));
    renderDrawer();

    await userEvent.click(await screen.findByText('Old title'));
    const box = screen.getByDisplayValue('Old title');
    await userEvent.clear(box);
    await userEvent.type(box, 'New title');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { title: 'New title' }));
  });

  it('closes the title editor on Escape without saving', async () => {
    h.get.mockResolvedValue(issue({ title: 'Keep me' }));
    renderDrawer();

    await userEvent.click(await screen.findByText('Keep me'));
    const box = screen.getByDisplayValue('Keep me');
    await userEvent.type(box, ' edited');
    await userEvent.keyboard('{Escape}');

    // Back to the heading, no update fired.
    expect(await screen.findByRole('heading', { name: 'Keep me' })).toBeInTheDocument();
    expect(h.update).not.toHaveBeenCalled();
  });

  // ── Tab switching + counts ───────────────────────────────────────────────

  it('switches to the Comments tab and loads comments', async () => {
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Comentarios'));
    await waitFor(() => expect(h.commentsList).toHaveBeenCalledWith('GIRA-1'));
  });

  it('renders @mention chips in existing comments', async () => {
    h.commentsList.mockResolvedValue([
      {
        id: 'c1',
        issueId: 'issue-cuid-0001',
        author: { id: 'u1', name: 'Reporter' },
        body: 'cc @[Bea](clbbb222bbb222bbb) please review',
        createdAt: '2026-06-02T00:00:00Z',
        visibility: 'client',
      },
    ]);
    renderDrawer();
    await screen.findByText('My issue title');
    await userEvent.click(screen.getByText('Comentarios'));
    const chip = await screen.findByText('@Bea');
    expect(chip).toHaveClass('mention-chip');
  });

  it('picks a participant from the @mention picker and posts a comment with the token', async () => {
    h.mentionable.mockResolvedValue([{ id: 'clbbb222bbb222bbb', name: 'Bea' }]);
    h.commentsCreate.mockResolvedValue({
      id: 'c2',
      issueId: 'issue-cuid-0001',
      author: { id: 'u1', name: 'Reporter' },
      body: '@[Bea](clbbb222bbb222bbb)',
      createdAt: '2026-06-03T00:00:00Z',
      visibility: 'client',
    });
    renderDrawer();
    await screen.findByText('My issue title');
    await userEvent.click(screen.getByText('Comentarios'));

    // Open the picker (lazy-loads the mentionable list), then pick Bea.
    await userEvent.click(screen.getByRole('button', { name: /mencionar · mention/ }));
    await waitFor(() => expect(h.mentionable).toHaveBeenCalledWith('GIRA-1'));
    await userEvent.click(await screen.findByRole('option', { name: '@Bea' }));

    // The token is now in the textarea; sending posts it verbatim.
    await userEvent.click(screen.getByRole('button', { name: /Enviar · Send/ }));
    await waitFor(() =>
      expect(h.commentsCreate).toHaveBeenCalledWith('GIRA-1', {
        body: '@[Bea](clbbb222bbb222bbb)',
        visibility: 'client',
      }),
    );
  });

  it('switches to the Worklogs tab and loads worklogs', async () => {
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await waitFor(() => expect(h.worklogsList).toHaveBeenCalledWith('GIRA-1'));
  });

  it('exposes an ARIA tablist and an accessible (keyboard) close button', async () => {
    const onClose = vi.fn();
    renderDrawer({ onClose });
    await screen.findByText('My issue title');

    expect(screen.getAllByRole('tab').length).toBeGreaterThanOrEqual(3);
    await userEvent.click(screen.getByRole('button', { name: /Cerrar · Close/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and on scrim click', async () => {
    const onClose = vi.fn();
    renderDrawer({ onClose });
    await screen.findByText('My issue title');

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  // ── Details tab: description editing ─────────────────────────────────────

  it('edits the description and saves with the Save button', async () => {
    h.get.mockResolvedValue(issue({ description: 'old desc' }));
    h.update.mockResolvedValue(issue({ description: 'new desc' }));
    renderDrawer();
    await screen.findByText('old desc');

    await userEvent.click(screen.getByRole('button', { name: /Editar · Edit/ }));
    const ta = screen.getByPlaceholderText(/Write a description/i);
    await userEvent.clear(ta);
    await userEvent.type(ta, 'new desc');
    await userEvent.click(screen.getByRole('button', { name: /Guardar · Save/ }));

    await waitFor(() =>
      expect(h.update).toHaveBeenCalledWith('GIRA-1', { description: 'new desc' }),
    );
  });

  it('saves the description via Cmd/Ctrl+Enter', async () => {
    h.get.mockResolvedValue(issue({ description: 'old' }));
    h.update.mockResolvedValue(issue({ description: 'changed' }));
    renderDrawer();
    await screen.findByText('old');

    await userEvent.click(screen.getByRole('button', { name: /Editar · Edit/ }));
    const ta = screen.getByPlaceholderText(/Write a description/i);
    await userEvent.clear(ta);
    await userEvent.type(ta, 'changed');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    await waitFor(() =>
      expect(h.update).toHaveBeenCalledWith('GIRA-1', { description: 'changed' }),
    );
  });

  it('does not save the description when unchanged (closes editor only)', async () => {
    h.get.mockResolvedValue(issue({ description: 'same' }));
    renderDrawer();
    await screen.findByText('same');

    await userEvent.click(screen.getByRole('button', { name: /Editar · Edit/ }));
    // Commit without changing anything.
    await userEvent.click(screen.getByRole('button', { name: /Guardar · Save/ }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Editar · Edit/ })).toBeInTheDocument(),
    );
    expect(h.update).not.toHaveBeenCalled();
  });

  it('closes the description editor on Escape', async () => {
    h.get.mockResolvedValue(issue({ description: 'keep' }));
    renderDrawer();
    await screen.findByText('keep');

    await userEvent.click(screen.getByRole('button', { name: /Editar · Edit/ }));
    const ta = screen.getByPlaceholderText(/Write a description/i);
    await userEvent.type(ta, 'X');
    await userEvent.keyboard('{Escape}');

    expect(await screen.findByText('keep')).toBeInTheDocument();
    expect(h.update).not.toHaveBeenCalled();
  });

  it('cancels the description editor with the Cancel button', async () => {
    h.get.mockResolvedValue(issue({ description: 'orig' }));
    renderDrawer();
    await screen.findByText('orig');

    await userEvent.click(screen.getByRole('button', { name: /Editar · Edit/ }));
    await userEvent.click(screen.getByRole('button', { name: /Cancelar · Cancel/ }));

    expect(await screen.findByText('orig')).toBeInTheDocument();
    expect(h.update).not.toHaveBeenCalled();
  });

  it('begins editing by clicking the empty-description placeholder', async () => {
    h.get.mockResolvedValue(issue({ description: '' }));
    h.update.mockResolvedValue(issue({ description: 'first words' }));
    renderDrawer();

    await userEvent.click(await screen.findByText(/No description — clic para añadir/));
    const ta = screen.getByPlaceholderText(/Write a description/i);
    await userEvent.type(ta, 'first words');
    await userEvent.click(screen.getByRole('button', { name: /Guardar · Save/ }));

    await waitFor(() =>
      expect(h.update).toHaveBeenCalledWith('GIRA-1', { description: 'first words' }),
    );
  });

  it('keeps the editor open when the description save fails', async () => {
    h.get.mockResolvedValue(issue({ description: 'fragile' }));
    h.update.mockImplementation(() => Promise.reject(new Error('nope')));
    renderDrawer();
    await screen.findByText('fragile');

    await userEvent.click(screen.getByRole('button', { name: /Editar · Edit/ }));
    const ta = screen.getByPlaceholderText(/Write a description/i);
    await userEvent.clear(ta);
    await userEvent.type(ta, 'attempted');
    await userEvent.click(screen.getByRole('button', { name: /Guardar · Save/ }));

    await waitFor(() => expect(h.update).toHaveBeenCalled());
    // Editor stays open: the textarea is still rendered with the unsaved draft.
    expect(screen.getByPlaceholderText(/Write a description/i)).toHaveValue('attempted');
  });

  // ── Comments tab ─────────────────────────────────────────────────────────

  it('renders existing comments including the internal-only badge', async () => {
    h.commentsList.mockResolvedValue([
      {
        id: 'c1',
        issueId: 'i1',
        author: { id: 'u1', name: 'Alice' },
        body: 'public comment',
        createdAt: '2026-06-01T00:00:00Z',
        visibility: 'client',
      },
      {
        id: 'c2',
        issueId: 'i1',
        author: { id: 'u2', name: 'Bob' },
        body: 'secret note',
        createdAt: '2026-06-01T00:00:00Z',
        visibility: 'internal',
      },
    ]);
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Comentarios'));
    expect(await screen.findByText('public comment')).toBeInTheDocument();
    expect(screen.getByText('secret note')).toBeInTheDocument();
    // The staff-only badge has the title "Solo visible para el equipo · Staff-only".
    expect(screen.getByTitle(/Staff-only/)).toBeInTheDocument();
  });

  it('shows the empty state when there are no comments', async () => {
    h.commentsList.mockResolvedValue([]);
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Comentarios'));
    expect(await screen.findByText(/No comments yet/)).toBeInTheDocument();
  });

  it('posts a new comment via the Send button (client visibility)', async () => {
    h.commentsCreate.mockResolvedValue({ id: 'c1', body: 'looking into it' });
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Comentarios'));
    const box = await screen.findByPlaceholderText(/Type a reply/i);
    await userEvent.type(box, 'looking into it');
    await userEvent.click(screen.getByRole('button', { name: /Enviar · Send/ }));

    await waitFor(() =>
      expect(h.commentsCreate).toHaveBeenCalledWith('GIRA-1', {
        body: 'looking into it',
        visibility: 'client',
      }),
    );
  });

  it('posts a new comment via Cmd/Ctrl+Enter', async () => {
    h.commentsCreate.mockResolvedValue({ id: 'c1', body: 'quick reply' });
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Comentarios'));
    const box = await screen.findByPlaceholderText(/Type a reply/i);
    await userEvent.type(box, 'quick reply');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    await waitFor(() =>
      expect(h.commentsCreate).toHaveBeenCalledWith('GIRA-1', {
        body: 'quick reply',
        visibility: 'client',
      }),
    );
  });

  it('posts an internal note when the internal toggle is checked (N1)', async () => {
    h.commentsCreate.mockResolvedValue({ id: 'c2', body: 'staff note', visibility: 'internal' });
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Comentarios'));
    await userEvent.click(await screen.findByRole('checkbox', { name: /internal note/i }));
    await userEvent.type(screen.getByPlaceholderText(/Type a reply/i), 'staff note');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    await waitFor(() =>
      expect(h.commentsCreate).toHaveBeenCalledWith('GIRA-1', {
        body: 'staff note',
        visibility: 'internal',
      }),
    );
  });

  it('disables the Send button until the body is non-empty', async () => {
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Comentarios'));
    const send = await screen.findByRole('button', { name: /Enviar · Send/ });
    expect(send).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText(/Type a reply/i), 'now has text');
    expect(send).toBeEnabled();
  });

  it('surfaces an error toast when posting a comment fails', async () => {
    h.commentsCreate.mockImplementation(() => Promise.reject(new Error('comment boom')));
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Comentarios'));
    await userEvent.type(await screen.findByPlaceholderText(/Type a reply/i), 'will fail');
    await userEvent.click(screen.getByRole('button', { name: /Enviar · Send/ }));

    await waitFor(() => expect(h.commentsCreate).toHaveBeenCalled());
  });

  // ── Worklogs tab: list + add ─────────────────────────────────────────────

  it('shows the worklogs empty state and the add button', async () => {
    h.worklogsList.mockResolvedValue([]);
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    expect(await screen.findByText(/No worklogs yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add worklog/ })).toBeInTheDocument();
  });

  it('renders the worklog summary totals (billable percentage)', async () => {
    h.worklogsList.mockResolvedValue([
      {
        id: 'w1',
        issueId: 'i1',
        user: { id: 'u1', name: 'Worker' },
        minutes: 90,
        note: 'did stuff',
        billable: true,
        loggedAt: '2026-06-01T00:00:00Z',
      },
      {
        id: 'w2',
        issueId: 'i1',
        user: { id: 'u1', name: 'Worker' },
        minutes: 30,
        note: 'non-billable',
        billable: false,
        loggedAt: '2026-06-01T00:00:00Z',
      },
    ]);
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    expect(await screen.findByText('did stuff')).toBeInTheDocument();
    expect(screen.getByText('non-billable')).toBeInTheDocument();
    // billable 90 / total 120 = 75%
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('opens the add-worklog form, validates, and creates a worklog', async () => {
    h.worklogsList.mockResolvedValue([]);
    h.worklogsCreate.mockResolvedValue({ id: 'w1', minutes: 45 });
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await userEvent.click(await screen.findByRole('button', { name: /Add worklog/ }));

    // Save is disabled with no minutes.
    const save = screen.getByRole('button', { name: /\+ Guardar · Save/ });
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText(/Minutos · Minutes/), '45');
    await userEvent.type(screen.getByPlaceholderText(/Nota · Note/), 'a note');
    expect(save).toBeEnabled();
    await userEvent.click(save);

    await waitFor(() =>
      expect(h.worklogsCreate).toHaveBeenCalledWith('GIRA-1', {
        minutes: 45,
        note: 'a note',
        billable: true,
      }),
    );
  });

  it('creates a non-billable worklog when the billable checkbox is unchecked', async () => {
    h.worklogsList.mockResolvedValue([]);
    h.worklogsCreate.mockResolvedValue({ id: 'w2', minutes: 20 });
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await userEvent.click(await screen.findByRole('button', { name: /Add worklog/ }));

    await userEvent.type(screen.getByPlaceholderText(/Minutos · Minutes/), '20');
    await userEvent.click(screen.getByRole('checkbox', { name: /Facturable · Billable/ }));
    await userEvent.click(screen.getByRole('button', { name: /\+ Guardar · Save/ }));

    await waitFor(() =>
      expect(h.worklogsCreate).toHaveBeenCalledWith('GIRA-1', {
        minutes: 20,
        note: '',
        billable: false,
      }),
    );
  });

  it('closes the add-worklog form with the ✕ button', async () => {
    h.worklogsList.mockResolvedValue([]);
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await userEvent.click(await screen.findByRole('button', { name: /Add worklog/ }));
    expect(screen.getByPlaceholderText(/Minutos · Minutes/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByPlaceholderText(/Minutos · Minutes/)).not.toBeInTheDocument();
    // Add button returns.
    expect(screen.getByRole('button', { name: /Add worklog/ })).toBeInTheDocument();
  });

  it('surfaces an error when creating a worklog fails', async () => {
    h.worklogsList.mockResolvedValue([]);
    h.worklogsCreate.mockImplementation(() => Promise.reject(new Error('worklog boom')));
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await userEvent.click(await screen.findByRole('button', { name: /Add worklog/ }));
    await userEvent.type(screen.getByPlaceholderText(/Minutos · Minutes/), '30');
    await userEvent.click(screen.getByRole('button', { name: /\+ Guardar · Save/ }));

    await waitFor(() => expect(h.worklogsCreate).toHaveBeenCalled());
    // The form stays open (showAdd not reset) since the mutation rejected.
    expect(screen.getByPlaceholderText(/Minutos · Minutes/)).toBeInTheDocument();
  });

  // ── Worklog row: inline edit + delete ────────────────────────────────────

  const oneWorklog = () => [
    {
      id: 'w1',
      issueId: 'i1',
      user: { id: 'u1', name: 'Worker' },
      minutes: 60,
      note: 'initial note',
      billable: true,
      loggedAt: '2026-06-01T00:00:00Z',
    },
  ];

  it('edits an existing worklog row inline and saves it', async () => {
    h.worklogsList.mockResolvedValue(oneWorklog());
    h.worklogsUpdate.mockResolvedValue({ id: 'w1', minutes: 75 });
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await userEvent.click(await screen.findByTitle('Editar · Edit'));

    const minutesInput = screen.getByDisplayValue('60');
    await userEvent.clear(minutesInput);
    await userEvent.type(minutesInput, '75');
    const noteInput = screen.getByDisplayValue('initial note');
    await userEvent.clear(noteInput);
    await userEvent.type(noteInput, 'updated note');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar · Save' }));

    await waitFor(() =>
      expect(h.worklogsUpdate).toHaveBeenCalledWith('w1', {
        minutes: 75,
        note: 'updated note',
        billable: true,
      }),
    );
  });

  it('cancels an inline worklog edit', async () => {
    h.worklogsList.mockResolvedValue(oneWorklog());
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await userEvent.click(await screen.findByTitle('Editar · Edit'));
    expect(screen.getByDisplayValue('60')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar · Cancel' }));
    expect(screen.queryByDisplayValue('60')).not.toBeInTheDocument();
    expect(screen.getByText('initial note')).toBeInTheDocument();
  });

  it('deletes a worklog after confirming the dialog', async () => {
    h.worklogsList.mockResolvedValue(oneWorklog());
    h.worklogsDelete.mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await userEvent.click(await screen.findByTitle('Eliminar · Delete'));

    await waitFor(() => expect(h.worklogsDelete).toHaveBeenCalledWith('w1'));
    confirmSpy.mockRestore();
  });

  it('does not delete a worklog when the confirm dialog is dismissed', async () => {
    h.worklogsList.mockResolvedValue(oneWorklog());
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await userEvent.click(await screen.findByTitle('Eliminar · Delete'));

    expect(h.worklogsDelete).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('surfaces an error when a worklog update fails', async () => {
    h.worklogsList.mockResolvedValue(oneWorklog());
    h.worklogsUpdate.mockImplementation(() => Promise.reject(new Error('update boom')));
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Registros'));
    await userEvent.click(await screen.findByTitle('Editar · Edit'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar · Save' }));

    await waitFor(() => expect(h.worklogsUpdate).toHaveBeenCalled());
    // Row stays in edit mode after a failed save.
    expect(screen.getByDisplayValue('60')).toBeInTheDocument();
  });

  // ── Timer panel: start / stop ────────────────────────────────────────────

  it('starts the timer for this issue when stopped', async () => {
    renderDrawer();
    await screen.findByText('My issue title');

    // Stopped state shows the Start button and 00:00:00.
    expect(screen.getByText('00:00:00')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Iniciar · Start/ }));

    expect(t.startMutate).toHaveBeenCalledTimes(1);
    expect(t.startMutate.mock.calls[0]![0]).toBe('GIRA-1');
  });

  it('stops the timer when one is running for this issue', async () => {
    t.activeData = {
      issueKey: 'GIRA-1',
      elapsedMinutes: 2,
      startedAt: new Date(Date.now() - 5_000).toISOString(),
    };
    renderDrawer();
    await screen.findByText('My issue title');

    // Running state shows the running label and a Stop button.
    expect(screen.getByText(/en marcha · running/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Parar · Stop/ }));

    expect(t.stopMutate).toHaveBeenCalledTimes(1);
  });

  it('shows the stopped label when a timer runs for a different issue', async () => {
    t.activeData = {
      issueKey: 'GIRA-99',
      elapsedMinutes: 1,
      startedAt: new Date().toISOString(),
    };
    renderDrawer();
    await screen.findByText('My issue title');

    expect(screen.getByText(/parado · stopped/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar · Start/ })).toBeInTheDocument();
  });

  // ── Cost tab ─────────────────────────────────────────────────────────────

  it('renders the cost tab with accrued amounts and the math block', async () => {
    h.cost.mockResolvedValue({
      minutes: 120,
      billableMinutes: 90,
      hourlyCents: 6000,
      accruedCents: 9000,
      currency: 'EUR',
      billingMode: 'hourly',
    });
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Coste'));
    await waitFor(() => expect(h.cost).toHaveBeenCalledWith('GIRA-1'));
    expect(await screen.findByText(/accrued cost/)).toBeInTheDocument();
    expect(screen.getByText('HORA')).toBeInTheDocument();
    expect(screen.getByText('EUR 90,00')).toBeInTheDocument();
    expect(screen.getByText(/accruedCents = 9000/)).toBeInTheDocument();
  });

  it('renders the fixed billing mode in the cost tab', async () => {
    h.cost.mockResolvedValue({
      minutes: 60,
      billableMinutes: 60,
      hourlyCents: null,
      accruedCents: 50000,
      currency: 'EUR',
      billingMode: 'fixed',
    });
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Coste'));
    expect(await screen.findByText('FIJO')).toBeInTheDocument();
    expect(screen.getByText('EUR 500,00')).toBeInTheDocument();
  });

  it('renders the cost error state when the cost query fails', async () => {
    h.cost.mockImplementation(() => Promise.reject(new Error('cost boom')));
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Coste'));
    expect(await screen.findByText(/Failed to load cost/)).toBeInTheDocument();
  });

  // ── Audit tab ────────────────────────────────────────────────────────────

  it('renders audit entries for this issue', async () => {
    h.auditList.mockResolvedValue({
      count: 1,
      entries: [
        {
          id: 'a1',
          actorId: 'u1',
          actor: { id: 'u1', name: 'Jane Doe' },
          action: 'issue.updated',
          entityType: 'Issue',
          entityId: 'issue-cuid-0001',
          before: {},
          after: {},
          at: '2026-06-01T12:34:56Z',
        },
      ],
    });
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Auditoría'));
    await waitFor(() =>
      expect(h.auditList).toHaveBeenCalledWith({
        entityType: 'Issue',
        entityId: 'issue-cuid-0001',
        limit: 12,
      }),
    );
    expect(await screen.findByText('issue.updated')).toBeInTheDocument();
    // Actor initials JD.
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders the audit empty state', async () => {
    h.auditList.mockResolvedValue({ count: 0, entries: [] });
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(screen.getByText('Auditoría'));
    expect(await screen.findByText(/No audit entries/)).toBeInTheDocument();
  });

  // ── Sidebar: editable fields ─────────────────────────────────────────────

  it('changes the status via the sidebar (move mutation)', async () => {
    h.get.mockResolvedValue(issue({ statusId: 's1' }));
    h.statusesList.mockResolvedValue([
      { id: 's1', name: 'Backlog', category: 'todo', order: 0 },
      { id: 's2', name: 'Done', category: 'done', order: 1 },
    ]);
    h.move.mockResolvedValue(issue({ statusId: 's2' }));
    renderDrawer();
    await screen.findByText('My issue title');

    const doneOption = (await screen.findByRole('option', { name: 'Done' })) as HTMLOptionElement;
    await userEvent.selectOptions(doneOption.closest('select')!, 's2');

    await waitFor(() => expect(h.move).toHaveBeenCalledWith('GIRA-1', { statusId: 's2' }));
  });

  it('changes the priority via the sidebar (update mutation)', async () => {
    h.get.mockResolvedValue(issue({ priority: 'medium' }));
    h.update.mockResolvedValue(issue({ priority: 'high' }));
    renderDrawer();
    await screen.findByText('My issue title');

    const highOption = screen.getByRole('option', { name: 'high' }) as HTMLOptionElement;
    await userEvent.selectOptions(highOption.closest('select')!, 'high');

    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { priority: 'high' }));
  });

  it('changes the type via the sidebar', async () => {
    h.get.mockResolvedValue(issue({ type: 'task' }));
    h.update.mockResolvedValue(issue({ type: 'bug' }));
    renderDrawer();
    await screen.findByText('My issue title');

    const bugOption = screen.getByRole('option', { name: 'bug' }) as HTMLOptionElement;
    await userEvent.selectOptions(bugOption.closest('select')!, 'bug');

    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { type: 'bug' }));
  });

  it('sets a resolution from the sidebar (D2 UI)', async () => {
    h.get.mockResolvedValue(issue({ resolution: null }));
    h.update.mockResolvedValue(issue({ resolution: 'fixed' }));
    renderDrawer();
    await screen.findByText('My issue title');

    // Exact name avoids colliding with the billing dropdown's "Precio fijo · Fixed price".
    const fixedOption = screen.getByRole('option', {
      name: 'Resuelto · Fixed',
    }) as HTMLOptionElement;
    await userEvent.selectOptions(fixedOption.closest('select')!, 'fixed');

    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { resolution: 'fixed' }));
  });

  it('sets a severity from the sidebar', async () => {
    h.get.mockResolvedValue(issue({ severity: null }));
    h.update.mockResolvedValue(issue({ severity: 'major' }));
    renderDrawer();
    await screen.findByText('My issue title');

    const majorOption = screen.getByRole('option', { name: /Major/ }) as HTMLOptionElement;
    await userEvent.selectOptions(majorOption.closest('select')!, 'major');

    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { severity: 'major' }));
  });

  it('sets a moscow priority from the sidebar', async () => {
    h.get.mockResolvedValue(issue({ moscow: null }));
    h.update.mockResolvedValue(issue({ moscow: 'must' }));
    renderDrawer();
    await screen.findByText('My issue title');

    const mustOption = screen.getByRole('option', {
      name: /Must · imprescindible/,
    }) as HTMLOptionElement;
    await userEvent.selectOptions(mustOption.closest('select')!, 'must');

    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { moscow: 'must' }));
  });

  it('commits a blocked reason on blur', async () => {
    h.get.mockResolvedValue(issue({ blockedReason: null }));
    h.update.mockResolvedValue(issue({ blockedReason: 'waiting on API' }));
    renderDrawer();
    await screen.findByText('My issue title');

    const blockedInput = screen.getByPlaceholderText(/motivo · blocker/);
    await userEvent.type(blockedInput, 'waiting on API');
    await userEvent.tab(); // blur

    await waitFor(() =>
      expect(h.update).toHaveBeenCalledWith('GIRA-1', { blockedReason: 'waiting on API' }),
    );
  });

  it('does not commit a blocked reason on blur when unchanged', async () => {
    h.get.mockResolvedValue(issue({ blockedReason: 'already set' }));
    renderDrawer();
    await screen.findByText('My issue title');

    const blockedInput = screen.getByPlaceholderText(/motivo · blocker/);
    blockedInput.focus();
    await userEvent.tab(); // blur without changing

    expect(h.update).not.toHaveBeenCalled();
  });

  it('clears a blocked reason to null on blur when emptied', async () => {
    h.get.mockResolvedValue(issue({ blockedReason: 'old blocker' }));
    h.update.mockResolvedValue(issue({ blockedReason: null }));
    renderDrawer();
    await screen.findByText('My issue title');

    const blockedInput = screen.getByPlaceholderText(/motivo · blocker/);
    await userEvent.clear(blockedInput);
    await userEvent.tab();

    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { blockedReason: null }));
  });

  it('changes the assignee via the sidebar', async () => {
    h.get.mockResolvedValue(issue({ assignee: null }));
    h.usersList.mockResolvedValue([{ id: 'u9', name: 'Dev Nine' }]);
    h.update.mockResolvedValue(issue({ assignee: { id: 'u9', name: 'Dev Nine' } }));
    renderDrawer();
    await screen.findByText('My issue title');

    const userOption = (await screen.findByRole('option', {
      name: 'Dev Nine',
    })) as HTMLOptionElement;
    await userEvent.selectOptions(userOption.closest('select')!, 'u9');

    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { assigneeId: 'u9' }));
  });

  it('sets a due date and clears it via the sidebar', async () => {
    h.get.mockResolvedValue(issue({ dueAt: '2026-07-01T00:00:00Z' }));
    h.update.mockResolvedValue(issue({ dueAt: null }));
    renderDrawer();
    await screen.findByText('My issue title');

    // The due date already set → clear button is rendered.
    await userEvent.click(screen.getByTitle(/Quitar fecha · Clear due date/));

    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { dueAt: null }));
  });

  it('adds a label from the sidebar dropdown', async () => {
    h.get.mockResolvedValue(issue({ labels: [] }));
    h.labelsList.mockResolvedValue([{ id: 'l1', name: 'backend', color: '#fff' }]);
    h.update.mockResolvedValue(issue({ labels: [{ id: 'l1', name: 'backend', color: '#fff' }] }));
    renderDrawer();
    await screen.findByText('My issue title');

    const labelOption = (await screen.findByRole('option', {
      name: 'backend',
    })) as HTMLOptionElement;
    await userEvent.selectOptions(labelOption.closest('select')!, 'l1');

    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { labelIds: ['l1'] }));
  });

  it('removes a label by clicking its chip', async () => {
    h.get.mockResolvedValue(issue({ labels: [{ id: 'l1', name: 'backend', color: '#fff' }] }));
    h.labelsList.mockResolvedValue([{ id: 'l1', name: 'backend', color: '#fff' }]);
    h.update.mockResolvedValue(issue({ labels: [] }));
    renderDrawer();
    await screen.findByText('My issue title');

    await userEvent.click(await screen.findByTitle(/Click to remove · Haz clic para quitar/));

    await waitFor(() => expect(h.update).toHaveBeenCalledWith('GIRA-1', { labelIds: [] }));
  });

  it('surfaces an error toast when an update fails', async () => {
    h.get.mockResolvedValue(issue({ priority: 'medium' }));
    h.update.mockImplementation(() => Promise.reject(new Error('update failed')));
    renderDrawer();
    await screen.findByText('My issue title');

    const highOption = screen.getByRole('option', { name: 'high' }) as HTMLOptionElement;
    await userEvent.selectOptions(highOption.closest('select')!, 'high');

    await waitFor(() => expect(h.update).toHaveBeenCalled());
  });

  it('surfaces an error toast when a status move fails', async () => {
    h.get.mockResolvedValue(issue({ statusId: 's1' }));
    h.statusesList.mockResolvedValue([
      { id: 's1', name: 'Backlog', category: 'todo', order: 0 },
      { id: 's2', name: 'Done', category: 'done', order: 1 },
    ]);
    h.move.mockImplementation(() => Promise.reject(new Error('move failed')));
    renderDrawer();
    await screen.findByText('My issue title');

    const doneOption = (await screen.findByRole('option', { name: 'Done' })) as HTMLOptionElement;
    await userEvent.selectOptions(doneOption.closest('select')!, 's2');

    await waitFor(() => expect(h.move).toHaveBeenCalledWith('GIRA-1', { statusId: 's2' }));
  });

  // ── Sidebar: billing mode (editable) ─────────────────────────────────────

  it('renders the fixed billing mode and price in the editable sidebar', async () => {
    h.get.mockResolvedValue(issue({ billingMode: 'fixed', fixedPriceCents: 50000 }));
    renderDrawer();
    await screen.findByText('My issue title');

    const fixedOpt = screen.getByRole('option', {
      name: 'Precio fijo · Fixed price',
    }) as HTMLOptionElement;
    expect(fixedOpt.selected).toBe(true);
    expect((screen.getByLabelText(/fixed price/i) as HTMLInputElement).value).toBe('500');
  });

  it('changes the billing mode to covered from the sidebar (€0, clears the price)', async () => {
    h.get.mockResolvedValue(issue({ billingMode: 'hourly' }));
    h.update.mockResolvedValue(issue({ billingMode: 'covered', fixedPriceCents: null }));
    renderDrawer();
    await screen.findByText('My issue title');

    const coveredOpt = screen.getByRole('option', {
      name: 'Cubierto · Covered (€0)',
    }) as HTMLOptionElement;
    await userEvent.selectOptions(coveredOpt.closest('select')!, 'covered');

    await waitFor(() =>
      expect(h.update).toHaveBeenCalledWith('GIRA-1', {
        billingMode: 'covered',
        fixedPriceCents: null,
      }),
    );
  });

  it('renders story points and estimate/logged in the sidebar', async () => {
    h.get.mockResolvedValue(issue({ storyPoints: 8, estimateMinutes: 120, loggedMinutes: 45 }));
    renderDrawer();
    await screen.findByText('My issue title');

    expect(screen.getByText('8')).toBeInTheDocument(); // story points
    expect(screen.getByText('2h')).toBeInTheDocument(); // estimate 120m
    expect(screen.getByText(/registrado 45m/)).toBeInTheDocument();
  });

  it('renders the assignee block when the issue is assigned', async () => {
    h.get.mockResolvedValue(issue({ assignee: { id: 'u5', name: 'Pat Lead' } }));
    h.usersList.mockResolvedValue([{ id: 'u5', name: 'Pat Lead' }]);
    renderDrawer();
    await screen.findByText('My issue title');

    // Name appears in both the selected option and the avatar caption.
    expect(screen.getAllByText('Pat Lead').length).toBeGreaterThanOrEqual(1);
  });

  // ── Emergency rendering ──────────────────────────────────────────────────

  it('renders the emergency hazard banner for emergency priority', async () => {
    h.get.mockResolvedValue(issue({ priority: 'emergency' }));
    renderDrawer();
    await screen.findByText('My issue title');

    expect(screen.getByText(/!! EMERGENCIA/)).toBeInTheDocument();
  });
});
