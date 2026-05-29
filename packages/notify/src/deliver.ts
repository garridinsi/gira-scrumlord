// SPDX-License-Identifier: GPL-3.0-or-later
// Actually send a notification over a channel. Isolated so dispatch logic can be
// tested without real SMTP, and so webhooks get the SSRF guard.

import nodemailer from 'nodemailer';
import { notifyConfig } from './config.js';
import { assertResolvedHostSafe } from './ssrf.js';

const transport = notifyConfig.isTest
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport(notifyConfig.smtp);

export interface Channel {
  kind: 'email' | 'webhook';
  target: string;
  name?: string;
}

export interface DeliverResult {
  ok: boolean;
  error?: string;
}

/** Send a plain email to one person (per-user notifications, not a channel). */
export async function sendUserEmail(
  to: string,
  subject: string,
  text: string,
): Promise<DeliverResult> {
  try {
    await transport.sendMail({ from: notifyConfig.mailFrom, to, subject, text });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deliver(
  channel: Channel,
  payload: Record<string, unknown>,
  opts: { allowPrivate?: boolean } = {},
): Promise<DeliverResult> {
  try {
    if (channel.kind === 'email') {
      const emergency = payload.type === 'issue.emergency';
      const subject = emergency
        ? `🚨 EMERGENCY: ${String(payload.title ?? 'incident')}`
        : `gira-scrumlord: ${String(payload.type ?? 'notification')}`;
      await transport.sendMail({
        from: notifyConfig.mailFrom,
        to: channel.target,
        subject,
        text: JSON.stringify(payload, null, 2),
      });
      return { ok: true };
    }

    if (channel.kind === 'webhook') {
      await assertResolvedHostSafe(channel.target, opts.allowPrivate ?? notifyConfig.allowPrivateWebhooks);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(channel.target, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!res.ok) return { ok: false, error: `webhook responded ${res.status}` };
        return { ok: true };
      } finally {
        clearTimeout(timeout);
      }
    }

    return { ok: false, error: `unknown channel kind: ${String(channel.kind)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
