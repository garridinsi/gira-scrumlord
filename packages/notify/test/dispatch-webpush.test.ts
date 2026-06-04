// SPDX-License-Identifier: GPL-3.0-or-later
// The Web Push fan-out in sendPersonal: a personal notification pushes to every subscription
// the recipient has, and a subscription the push service reports as gone (404/410) is pruned.
// config + deliver are mocked (webPushEnabled on, sendWebPush spied); prisma is real.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendWebPushMock = vi.hoisted(() => vi.fn());
vi.mock('../src/config.js', () => ({
  notifyConfig: { telegramEnabled: false, webPushEnabled: true },
}));
vi.mock('../src/deliver.js', () => ({
  sendUserEmail: vi.fn().mockResolvedValue({ ok: true }),
  sendTelegram: vi.fn(),
  sendWebPush: sendWebPushMock,
  deliver: vi.fn(),
}));

import { dispatchEvent } from '../src/dispatch.js';
import { makeIssue, prisma, resetDb } from './helpers/db.js';

describe('Web Push fan-out on personal notifications', () => {
  beforeEach(async () => {
    await resetDb();
    sendWebPushMock.mockReset().mockResolvedValue({ ok: true });
  });

  it('pushes to every subscription the recipient has', async () => {
    const { issue } = await makeIssue('T-1', 'T');
    const assignee = await prisma.user.create({ data: { email: 'd@e.test', name: 'Dev' } });
    await prisma.issue.update({ where: { id: issue.id }, data: { assigneeId: assignee.id } });
    await prisma.pushSubscription.createMany({
      data: [
        { userId: assignee.id, endpoint: 'https://push.test/1', p256dh: 'a', auth: 'b' },
        { userId: assignee.id, endpoint: 'https://push.test/2', p256dh: 'c', auth: 'd' },
      ],
    });

    await dispatchEvent({
      type: 'issue.assigned',
      payload: { issueKey: 'T-1', assigneeId: assignee.id, title: 'X', actorId: 'other' },
    });
    expect(sendWebPushMock).toHaveBeenCalledTimes(2);
  });

  it('prunes a subscription the push service reports as gone', async () => {
    const { issue } = await makeIssue('T-2', 'T2');
    const assignee = await prisma.user.create({ data: { email: 'g@e.test', name: 'Gone' } });
    await prisma.issue.update({ where: { id: issue.id }, data: { assigneeId: assignee.id } });
    await prisma.pushSubscription.create({
      data: { userId: assignee.id, endpoint: 'https://push.test/dead', p256dh: 'a', auth: 'b' },
    });
    sendWebPushMock.mockResolvedValue({ ok: false, gone: true });

    await dispatchEvent({
      type: 'issue.assigned',
      payload: { issueKey: 'T-2', assigneeId: assignee.id, title: 'Y', actorId: 'other' },
    });
    expect(await prisma.pushSubscription.count({ where: { userId: assignee.id } })).toBe(0);
  });
});
