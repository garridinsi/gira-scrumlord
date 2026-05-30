// SPDX-License-Identifier: GPL-3.0-or-later
// Sends magic-link emails. In dev they land in Mailpit (http://localhost:8025);
// in tests we use nodemailer's jsonTransport so nothing is actually sent.

import nodemailer from 'nodemailer';
import { config } from '../../config.js';

const useAuth = Boolean(config.SMTP_USER && config.SMTP_PASS);

const transport =
  config.NODE_ENV === 'test'
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_SECURE,
        // Authenticate only when credentials are provided (Gmail/relay); the dev
        // Mailpit relay and the IP-allowlisted Workspace relay need none. When we DO
        // send credentials, force an encrypted channel (mandatory STARTTLS on 587 /
        // implicit TLS on 465) so the password is never transmitted in cleartext.
        ...(useAuth
          ? {
              auth: { user: config.SMTP_USER!, pass: config.SMTP_PASS! },
              requireTLS: !config.SMTP_SECURE,
              tls: { minVersion: 'TLSv1.2' },
            }
          : {}),
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

/**
 * Sent to the NEW address when a user requests an email change — clicking the link
 * is what proves they control the address and completes the switch. Deliberately
 * addressed to the new email only; the old address keeps working until confirmed.
 */
export async function sendEmailChangeVerification(newEmail: string, link: string): Promise<void> {
  await transport.sendMail({
    from: config.MAIL_FROM,
    to: newEmail,
    subject: 'Confirm your new gira-scrumlord email 🌀',
    text: `Confirm this address for your gira-scrumlord account:\n\n${link}\n\nIf you didn't request an email change, ignore this — nothing changes until the link is clicked.`,
    html: `<p>Confirm this address for your <strong>gira-scrumlord</strong> account 🌀</p>
<p><a href="${link}">Click here to confirm your new email</a></p>
<p style="color:#888;font-size:13px">Didn't request this? Ignore it — nothing changes until the link is clicked.</p>`,
  });
}
