// SPDX-License-Identifier: GPL-3.0-or-later
// The personal-email failure path: when the per-user email send fails, dispatch must record
// the Notification as 'failed' (not throw, not silently drop). The delivery boundary is
// mocked so the send returns a failure deterministically; prisma stays real.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendUserEmailMock = vi.hoisted(() => vi.fn());
const deliverMock = vi.hoisted(() => vi.fn());
vi.mock('../src/deliver.js', () => ({
  sendUserEmail: sendUserEmailMock,
  deliver: deliverMock,
}));

import { dispatchEvent } from '../src/dispatch.js';
import { makeIssue, prisma, resetDb } from './helpers/db.js';

describe('personal email delivery failure is recorded', () => {
  beforeEach(async () => {
    await resetDb();
    sendUserEmailMock.mockReset();
    deliverMock.mockReset().mockResolvedValue({ ok: true });
  });

  it("marks the assignee's Notification 'failed' with the error when the send fails", async () => {
    const { issue } = await makeIssue('T-9', 'T9');
    const assignee = await prisma.user.create({ data: { email: 'dev@example.test', name: 'Dev' } });
    await prisma.issue.update({ where: { id: issue.id }, data: { assigneeId: assignee.id } });

    sendUserEmailMock.mockResolvedValue({ ok: false, error: 'SMTP down' });

    const res = await dispatchEvent({
      type: 'issue.assigned',
      payload: { issueKey: 'T-9', assigneeId: assignee.id, title: 'X', actorId: 'someone-else' },
    });
    expect(res.userEmails).toBe(0); // counted only on success
    const n = await prisma.notification.findFirst({ where: { userId: assignee.id } });
    expect(n?.status).toBe('failed');
    expect(n?.error).toBe('SMTP down');
  });
});
