// SPDX-License-Identifier: GPL-3.0-or-later
// Actually send a notification over a channel. Isolated so dispatch logic can be
// tested without real SMTP, and so webhooks get the SSRF guard.

import nodemailer from 'nodemailer';
import { Agent, fetch as undiciFetch } from 'undici';
import webpush from 'web-push';
import { notifyConfig } from './config.js';
import { assertResolvedHostSafe, createSafeWebhookAgent } from './ssrf.js';

// A single pooled dispatcher whose connect-time lookup re-validates the resolved IP,
// so webhook delivery connects only to public addresses even under DNS rebinding.
const webhookAgent: Agent = createSafeWebhookAgent();

// Configure VAPID once at module load — only meaningful (and only valid) when both keys are
// set. When the channel is off, sendWebPush short-circuits before ever touching the library.
/* c8 ignore next 7 -- VAPID setup runs only with real keys configured (off in tests). */
if (notifyConfig.webPushEnabled) {
  webpush.setVapidDetails(
    notifyConfig.vapidSubject,
    notifyConfig.vapidPublicKey,
    notifyConfig.vapidPrivateKey,
  );
}

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

/**
 * Push a message to one Telegram chat via the Bot API. Egress is the fixed, trusted host
 * api.telegram.org (no SSRF model — the bot token, not a user URL, is the secret), so this
 * does NOT use the webhook SSRF agent. No-op-fail when the channel is unconfigured.
 */
export async function sendTelegram(chatId: string, text: string): Promise<DeliverResult> {
  if (!notifyConfig.telegramEnabled) return { ok: false, error: 'telegram not configured' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await undiciFetch(
      `https://api.telegram.org/bot${notifyConfig.telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
        signal: controller.signal,
      },
    );
    if (!res.ok) return { ok: false, error: `telegram responded ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timeout);
  }
}

export interface WebPushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}
/** `gone` marks a subscription the push service rejected as expired (404/410) → prune it. */
export interface WebPushResult extends DeliverResult {
  gone?: boolean;
}

/**
 * Push an encrypted notification to one Web Push subscription via the VAPID-signed protocol
 * (the web-push library handles aes128gcm payload encryption). No-op-fail when unconfigured.
 * A 404/410 from the push service means the subscription is dead — flagged via `gone` so the
 * caller can prune it.
 */
export async function sendWebPush(
  sub: WebPushSub,
  payload: { title: string; body: string; url?: string },
): Promise<WebPushResult> {
  if (!notifyConfig.webPushEnabled) return { ok: false, error: 'web push not configured' };
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    const gone = status === 404 || status === 410;
    return { ok: false, gone, error: e instanceof Error ? e.message : String(e) };
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
