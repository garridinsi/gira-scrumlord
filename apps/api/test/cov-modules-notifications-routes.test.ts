// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-focused cases for src/modules/notifications/routes.ts. These hit the
// channel-PATCH target-revalidation block, the project-scoped channel-test branch,
// and the FAILED-delivery arms of the notification-record write — paths the broader
// notifications.test.ts doesn't exercise.
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('cov src/modules/notifications/routes.ts', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
  });

  // PATCH /channels/:id — the `input.target !== undefined` block re-fetches the
  // channel kind and re-validates the new target (lines 70–77). For an email
  // channel validateWebhookTarget is a no-op, so the patch succeeds.
  it('patches a channel target, re-validating against the stored kind', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const ch = (
      await app.inject({
        method: 'POST',
        url: '/channels',
        headers: { cookie },
        payload: { name: 'oncall', kind: 'email', target: 'a@b.test', events: ['issue.emergency'] },
      })
    ).json() as { id: string };

    const patched = await app.inject({
      method: 'PATCH',
      url: `/channels/${ch.id}`,
      headers: { cookie },
      payload: { target: 'moved@b.test' },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().target).toBe('moved@b.test');
  });

  // PATCH /channels/:id with a target on a missing channel → the existing-lookup
  // miss throws notFound (line 75).
  it('404s when patching the target of a missing channel', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const res = await app.inject({
      method: 'PATCH',
      url: '/channels/claaaaaaaaaaaaaaaaaaaaaaaa',
      headers: { cookie },
      payload: { target: 'whoever@b.test' },
    });
    expect(res.statusCode).toBe(404);
  });

  // POST /channels/:id/test for a PROJECT-scoped channel takes the scope branch
  // (lines 112–119): resolve the project and assert access before delivering.
  it('test-sends a project-scoped channel (scope-access branch)', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    const project = await prisma.project.findUnique({ where: { key: projectKey } });

    const ch = (
      await app.inject({
        method: 'POST',
        url: '/channels',
        headers: { cookie },
        payload: {
          name: 'proj-oncall',
          kind: 'email',
          target: 'p@x.test',
          scope: 'project',
          projectId: project!.id,
          events: ['issue.emergency'],
        },
      })
    ).json() as { id: string };

    const res = await app.inject({
      method: 'POST',
      url: `/channels/${ch.id}/test`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    // The successful test still writes a 'sent' notification record.
    const note = await prisma.notification.findFirst({ where: { channelId: ch.id } });
    expect(note!.status).toBe('sent');
    expect(note!.sentAt).not.toBeNull();
  });

  // A webhook whose host can't resolve makes deliver() return { ok:false, error },
  // so the record is written with the FAILED arms: status 'failed', sentAt null,
  // and the (sliced) error string (lines 130, 132, 133). The `.invalid` TLD is
  // reserved (RFC 6761) and never resolves, so this is deterministic and makes no
  // real network egress; it still passes the create-time SSRF check (public host).
  it('records a failed delivery when the webhook host cannot resolve', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const ch = (
      await app.inject({
        method: 'POST',
        url: '/channels',
        headers: { cookie },
        payload: {
          name: 'hook',
          kind: 'webhook',
          target: 'http://gira-no-such-host.invalid/hook',
          events: ['issue.emergency'],
        },
      })
    ).json() as { id: string };

    const res = await app.inject({
      method: 'POST',
      url: `/channels/${ch.id}/test`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(false);

    const note = await prisma.notification.findFirst({ where: { channelId: ch.id } });
    expect(note!.status).toBe('failed');
    expect(note!.sentAt).toBeNull();
    expect(note!.error).toBeTruthy();
  });
});
