// SPDX-License-Identifier: GPL-3.0-or-later
// Parse a WordPress form submission into a normalized intake.
// Returns externalRef (formId or id) for deduplication on (source, externalRef).
// Tolerant of common field names (CF7 / WPForms / generic).

import type { NormalizedIntake } from './types.js';

interface WpPayload {
  subject?: string;
  title?: string;
  message?: string;
  description?: string;
  body?: string;
  name?: string;
  email?: string;
  formId?: string;
  id?: string;
}

export function parseWordpress(payload: unknown): NormalizedIntake {
  const p = (payload ?? {}) as WpPayload;
  const title = p.subject ?? p.title ?? 'WordPress submission';
  const message = p.message ?? p.description ?? p.body ?? '';
  const from = [p.name, p.email ? `<${p.email}>` : null].filter(Boolean).join(' ');
  return {
    externalRef: p.formId ?? p.id,
    title: String(title).slice(0, 200),
    description: from ? `${message}\n\n— from ${from}` : message,
    type: 'task',
    priority: 'medium',
    labels: ['wordpress'],
  };
}
