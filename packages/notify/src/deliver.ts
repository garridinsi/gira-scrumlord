// SPDX-License-Identifier: GPL-3.0-or-later
// Actually send a notification over a channel. Isolated so dispatch logic can be
// tested without real SMTP, and so webhooks get the SSRF guard.

import nodemailer from 'nodemailer';
import { Agent, fetch as undiciFetch } from 'undici';
import { notifyConfig } from './config.js';
import { assertResolvedHostSafe, createSafeWebhookAgent } from './ssrf.js';

// A single pooled dispatcher whose connect-time lookup re-validates the resolved IP,
// so webhook delivery connects only to public addresses even under DNS rebinding.
const webhookAgent: Agent = createSafeWebhookAgent();

/* c8 ignore start -- transport selection is environment-determined, not a unit under test:
   tests always take the jsonTransport arm; the real-SMTP arm only runs when NODE_ENV !== 'test'. */
const transport = notifyConfig.isTest
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport(notifyConfig.smtp);
/* c8 ignore stop */

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
      const allowPrivate = opts.allowPrivate ?? notifyConfig.allowPrivateWebhooks;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        // Follow redirects MANUALLY, re-validating each hop's host — a validated
        // public endpoint could otherwise 302 us to a private/metadata address
        // (SSRF). Cap the hops to avoid loops.
        let url = channel.target;
        for (let hop = 0; hop < 5; hop++) {
          // Defence in depth: pre-validate the hostname's DNS here, AND pin the actual
          // connection IP via the agent's connect-time lookup (closes the rebind TOCTOU).
          await assertResolvedHostSafe(url, allowPrivate);
          const res = await undiciFetch(url, {
            method: hop === 0 ? 'POST' : 'GET',
            headers: { 'content-type': 'application/json' },
            body: hop === 0 ? JSON.stringify(payload) : undefined,
            redirect: 'manual',
            signal: controller.signal,
            /* c8 ignore next -- the SSRF-pinning agent (the !allowPrivate arm) only runs for a
               PUBLIC host; loopback test targets with allowPrivate=false are rejected earlier by
               assertResolvedHostSafe, so this arm can't be reached from a local server. */
            dispatcher: allowPrivate ? undefined : webhookAgent,
          });
          if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get('location');
            if (!loc)
              return { ok: false, error: `webhook redirect with no location (${res.status})` };
            url = new URL(loc, url).toString(); // resolve relative; re-validated next loop
            continue;
          }
          if (!res.ok) return { ok: false, error: `webhook responded ${res.status}` };
          return { ok: true };
        }
        return { ok: false, error: 'webhook exceeded redirect limit' };
      } finally {
        clearTimeout(timeout);
      }
    }

    return { ok: false, error: `unknown channel kind: ${String(channel.kind)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
