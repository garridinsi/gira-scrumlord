// SPDX-License-Identifier: GPL-3.0-or-later
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, '../../../.env') });

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpSecure = process.env.SMTP_SECURE === 'true';
const useAuth = Boolean(smtpUser && smtpPass);

export const notifyConfig = {
  smtp: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: smtpSecure,
    // Authenticate only when both credentials are set (Gmail/relay); dev Mailpit and
    // the IP-allowlisted Workspace relay need none. When we DO send credentials,
    // force TLS (STARTTLS on 587 / implicit on 465) so they never go in cleartext.
    ...(useAuth
      ? {
          auth: { user: smtpUser as string, pass: smtpPass as string },
          requireTLS: !smtpSecure,
          tls: { minVersion: 'TLSv1.2' as const },
        }
      : {}),
  },
  mailFrom: process.env.MAIL_FROM ?? 'gira-scrumlord <no-reply@gira.local>',
  // Webhooks to private/loopback hosts are blocked unless explicitly allowed (dev/tests).
  allowPrivateWebhooks: process.env.ALLOW_PRIVATE_WEBHOOKS === 'true',
  isTest: process.env.NODE_ENV === 'test',
};
