// SPDX-License-Identifier: GPL-3.0-or-later
// The Telegram fan-out in sendPersonal: when the channel is configured AND the recipient has
// a linked chat, a personal notification is ALSO pushed to Telegram; otherwise it is not.
// config + deliver are mocked (telegramEnabled on, sendTelegram spied); prisma is real.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendTelegramMock = vi.hoisted(() => vi.fn());
const sendUserEmailMock = vi.hoisted(() => vi.fn());
vi.mock('../src/config.js', () => ({ notifyConfig: { telegramEnabled: true } }));
vi.mock('../src/deliver.js', () => ({
  sendUserEmail: sendUserEmailMock,
  sendTelegram: sendTelegramMock,
  deliver: vi.fn(),
}));

import { dispatchEvent } from '../src/dispatch.js';
import { makeIssue, prisma, resetDb } from './helpers/db.js';

describe('Telegram fan-out on personal notifications', () => {
  beforeEach(async () => {
    await resetDb();
    sendTelegramMock.mockReset().mockResolvedValue({ ok: true });
    sendUserEmailMock.mockReset().mockResolvedValue({ ok: true });
  });

  it('also pushes to Telegram when the recipient has linked a chat', async () => {
    const { issue } = await makeIssue('T-1', 'T');
    const assignee = await prisma.user.create({ data: { email: 'dev@example.test', name: 'Dev' } });
    await prisma.issue.update({ where: { id: issue.id }, data: { assigneeId: assignee.id } });
    await prisma.telegramLink.create({ data: { userId: assignee.id, chatId: '99887766' } });

    await dispatchEvent({
      type: 'issue.assigned',
      payload: { issueKey: 'T-1', assigneeId: assignee.id, title: 'X', actorId: 'someone-else' },
    });

    expect(sendUserEmailMock).toHaveBeenCalledTimes(1); // email still sent
    expect(sendTelegramMock).toHaveBeenCalledWith('99887766', expect.any(String));
  });

  it('does not push to Telegram when the recipient has no linked chat', async () => {
    const { issue } = await makeIssue('T-2', 'T2');
    const assignee = await prisma.user.create({
      data: { email: 'nolink@example.test', name: 'NoLink' },
    });
    await prisma.issue.update({ where: { id: issue.id }, data: { assigneeId: assignee.id } });

    await dispatchEvent({
      type: 'issue.assigned',
      payload: { issueKey: 'T-2', assigneeId: assignee.id, title: 'Y', actorId: 'someone-else' },
    });

    expect(sendUserEmailMock).toHaveBeenCalledTimes(1);
    expect(sendTelegramMock).not.toHaveBeenCalled();
  });
});
