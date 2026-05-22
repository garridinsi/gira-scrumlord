// SPDX-License-Identifier: GPL-3.0-or-later
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, '../../../.env') });

export const notifyConfig = {
  smtp: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === 'true',
  },
  mailFrom: process.env.MAIL_FROM ?? 'gira-scrumlord <no-reply@gira.local>',
  // Webhooks to private/loopback hosts are blocked unless explicitly allowed (dev/tests).
  allowPrivateWebhooks: process.env.ALLOW_PRIVATE_WEBHOOKS === 'true',
  isTest: process.env.NODE_ENV === 'test',
};
