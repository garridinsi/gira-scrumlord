// SPDX-License-Identifier: GPL-3.0-or-later
// Sends magic-link emails. In dev they land in Mailpit (http://localhost:8025);
// in tests we use nodemailer's jsonTransport so nothing is actually sent.

import nodemailer from 'nodemailer';
import { config } from '../../config.js';

const transport =
  config.NODE_ENV === 'test'
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_SECURE,
        // Authenticate only when credentials are provided (Gmail/relay); the dev
        // Mailpit relay needs none.
        auth:
          config.SMTP_USER && config.SMTP_PASS
            ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
            : undefined,
      });

export async function sendMagicLink(email: string, link: string): Promise<void> {
  await transport.sendMail({
    from: config.MAIL_FROM,
    to: email,
    subject: 'Your gira-scrumlord sign-in link 🌀',
    text: `Sign in to gira-scrumlord:\n\n${link}\n\nThis link expires in ${config.MAGIC_LINK_TTL_MINUTES} minutes. If you didn't request it, ignore this email.`,
    html: `<p>Sign in to <strong>gira-scrumlord</strong> 🌀</p>
<p><a href="${link}">Click here to sign in</a></p>
<p style="color:#888;font-size:13px">Expires in ${config.MAGIC_LINK_TTL_MINUTES} minutes. Didn't request it? Ignore this.</p>`,
  });
}
