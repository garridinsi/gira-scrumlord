// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-focused suite for AccountPage: the loading state and the `!me.data`
// null return, the saveProfile pending/success/error labels, the role/kind
// fallbacks on the identity rows, the requestEmail error body, and the session
// list fallbacks (unknown device · "—" ip · createdAt-only "desde" line) plus the
// revokeOthers pending label. The happy paths live in account-page.test.tsx; this
// file only drives the branches that suite leaves uncovered.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './render';

// vi.hoisted so the hoisted vi.mock factories can close over the spies. `me` is a
// MUTABLE ref so a test can flip useMe into loading / no-data without a fresh
// object identity clobbering the seeded form between renders.
const { updateMe, sessions, revokeOtherSessions, requestEmailChange, me } = vi.hoisted(() => ({
  updateMe: vi.fn(),
  sessions: vi.fn(),
  revokeOtherSessions: vi.fn(),
  requestEmailChange: vi.fn(),
  me: {
    value: {
      data: {
        id: 'u1',
        name: 'Ada',
        email: 'ada@example.test',
        role: 'admin',
        kind: 'staff',
        locale: 'es',
      } as Record<string, unknown> | undefined,
      isLoading: false,
    },
  },
}));

vi.mock('../api/client', () => ({
  auth: {
    updateMe: (d: unknown) => updateMe(d),
    sessions: () => sessions(),
    revokeOtherSessions: () => revokeOtherSessions(),
    requestEmailChange: (e: string) => requestEmailChange(e),
    telegram: () => Promise.resolve({ enabled: false, linked: false, chatId: null }),
    linkTelegram: () => Promise.resolve(),
    unlinkTelegram: () => Promise.resolve(),
    pushConfig: () => Promise.resolve({ enabled: false, publicKey: null }),
    subscribePush: () => Promise.resolve(),
    unsubscribePush: () => Promise.resolve(),
  },
  // A real-ish ApiError so `(err as ApiError)?.message` resolves the message branch.
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/useAuth', () => ({ useMe: () => me.value }));

import { AccountPage } from '../pages/AccountPage';

describe('AccountPage (coverage)', () => {
  beforeEach(() => {
    me.value = {
      data: {
        id: 'u1',
        name: 'Ada',
        email: 'ada@example.test',
        role: 'admin',
        kind: 'staff',
        locale: 'es',
      },
      isLoading: false,
    };
    updateMe.mockReset();
    sessions.mockReset().mockResolvedValue([]);
    revokeOtherSessions.mockReset();
    requestEmailChange.mockReset();
  });

  // ── me query: loading · no data ─────────────────────────────────────────────

  it('shows the cargando · loading state while me is pending', () => {
    me.value = { data: undefined, isLoading: true };
    renderWithProviders(<AccountPage />);
    expect(screen.getByText(/cargando · loading/i)).toBeInTheDocument();
  });

  it('renders nothing when me resolves with no user (not loading, no data)', () => {
    me.value = { data: undefined, isLoading: false };
    const { container } = renderWithProviders(<AccountPage />);
    // `if (!me.data) return null` — the page renders nothing, no heading.
    expect(container.querySelector('h1')).toBeNull();
    expect(screen.queryByText('MI CUENTA')).not.toBeInTheDocument();
  });

  // ── saveProfile: pending · success · error ──────────────────────────────────

  it('shows the "Guardando…" pending label while the profile save is in flight', async () => {
    // A never-resolving save keeps the mutation pending so isPending stays true.
    updateMe.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AccountPage />);
    const nameInput = await screen.findByDisplayValue('Ada');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Ada Lovelace');
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    expect(await screen.findByText('Guardando…')).toBeInTheDocument();
  });

  it('shows the "✓ guardado · saved" confirmation after a successful, non-dirty save', async () => {
    // The badge condition is `saveProfile.isSuccess && !dirty`, and dirty compares
    // the typed name/locale to u (from useMe — STATIC here at name 'Ada'). To make
    // the save enabled (dirty true) yet end non-dirty: type a new name, click Save,
    // then revert the field back to 'Ada' so dirty flips false while isSuccess holds.
    updateMe.mockResolvedValue({
      id: 'u1',
      name: 'Ada Byron',
      email: 'ada@example.test',
      role: 'admin',
      kind: 'staff',
      locale: 'es',
    });
    renderWithProviders(<AccountPage />);
    const nameInput = await screen.findByDisplayValue('Ada');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Ada Byron');
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(updateMe).toHaveBeenCalledTimes(1));
    // Revert the typed name back to the static u.name → dirty false, badge appears.
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Ada');
    expect(await screen.findByText(/guardado · saved/i)).toBeInTheDocument();
  });

  it('surfaces the save error message when the profile save rejects', async () => {
    updateMe.mockRejectedValue(new Error('correo en uso'));
    renderWithProviders(<AccountPage />);
    const nameInput = await screen.findByDisplayValue('Ada');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Ada Lovelace');
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    expect(await screen.findByText('correo en uso')).toBeInTheDocument();
  });

  // ── identity rows: ROLE_LABEL fallback · client kind ─────────────────────────

  it('falls back to the raw role and shows the client kind label for a client user', async () => {
    me.value = {
      data: {
        id: 'u2',
        name: 'Bob',
        email: 'bob@client.test',
        role: 'superadmin', // not in ROLE_LABEL → `?? u.role` raw fallback
        kind: 'client', // → "Cliente · Client" branch
        locale: 'en',
      },
      isLoading: false,
    };
    renderWithProviders(<AccountPage />);
    expect(await screen.findByText('superadmin')).toBeInTheDocument();
    expect(screen.getByText('Cliente · Client')).toBeInTheDocument();
  });

  // ── requestEmail error body ──────────────────────────────────────────────────

  it('surfaces the email-change error message when the request rejects', async () => {
    requestEmailChange.mockRejectedValue(new Error('dominio bloqueado'));
    renderWithProviders(<AccountPage />);
    await userEvent.type(await screen.findByLabelText(/New email/i), 'new@example.test');
    await userEvent.click(screen.getByRole('button', { name: /Send link/ }));
    expect(await screen.findByText('dominio bloqueado')).toBeInTheDocument();
  });

  // ── sessions: fallbacks (unknown device · "—" ip · createdAt-only line) ──────

  it('renders session fallbacks: unknown device, "—" ip and the "desde" created line', async () => {
    // userAgent null → unknown-device label (317); ip null → "—" (320);
    // lastSeenAt absent → the `desde …createdAt` else branch (323).
    sessions.mockResolvedValue([
      {
        id: 's1',
        current: false,
        userAgent: null,
        ip: null,
        createdAt: '2026-01-15T00:00:00Z',
        lastSeenAt: null,
      },
    ]);
    renderWithProviders(<AccountPage />);
    expect(
      await screen.findByText(/dispositivo desconocido · unknown device/i),
    ).toBeInTheDocument();
    // The meta line is `{ip ?? '—'} · {lastSeenAt ? … : `desde …createdAt`}`. With a
    // null ip and null lastSeenAt it reads "— · desde <localized createdAt>".
    expect(screen.getByText(/—\s*·\s*desde/)).toBeInTheDocument();
  });

  it('shows the "…" pending label while revoke-others is in flight', async () => {
    sessions.mockResolvedValue([
      {
        id: 's1',
        current: true,
        userAgent: 'Chrome',
        ip: '1.2.3.4',
        createdAt: '2026-01-01T00:00:00Z',
        lastSeenAt: '2026-06-01T00:00:00Z',
      },
      {
        id: 's2',
        current: false,
        userAgent: 'Safari',
        ip: '5.6.7.8',
        createdAt: '2026-01-01T00:00:00Z',
        lastSeenAt: '2026-05-01T00:00:00Z',
      },
    ]);
    // Never-resolving revoke keeps the mutation pending so the "…" label renders.
    revokeOtherSessions.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AccountPage />);
    await userEvent.click(await screen.findByRole('button', { name: /everywhere else/i }));
    expect(await screen.findByText('…')).toBeInTheDocument();
  });
});
