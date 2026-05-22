// SPDX-License-Identifier: GPL-3.0-or-later
// Parse a Grafana alerting webhook payload into normalized intakes. Pure.

import type { Priority } from '@gira/shared';
import type { NormalizedIntake } from './types.js';

export function grafanaSeverityToPriority(severity?: string): Priority {
  switch ((severity ?? '').toLowerCase()) {
    case 'critical':
      return 'emergency';
    case 'error':
    case 'high':
      return 'urgent';
    case 'warning':
    case 'medium':
      return 'high';
    case 'info':
    case 'low':
      return 'medium';
    default:
      return 'high';
  }
}

interface GrafanaAlert {
  status?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  fingerprint?: string;
}
interface GrafanaPayload {
  status?: string;
  alerts?: GrafanaAlert[];
  title?: string;
  message?: string;
}

export function parseGrafana(payload: unknown): NormalizedIntake[] {
  const p = (payload ?? {}) as GrafanaPayload;
  const alerts = Array.isArray(p.alerts) ? p.alerts : [];

  if (alerts.length === 0) {
    // Legacy / single-message payload fallback.
    if (p.title || p.message) {
      return [
        {
          title: String(p.title ?? 'Grafana alert').slice(0, 200),
          description: String(p.message ?? ''),
          type: 'bug',
          priority: 'high',
          labels: ['grafana'],
          resolved: p.status === 'resolved',
        },
      ];
    }
    return [];
  }

  return alerts.map((a) => {
    const labels = a.labels ?? {};
    const ann = a.annotations ?? {};
    const name = labels.alertname ?? ann.summary ?? 'Grafana alert';
    return {
      externalRef: a.fingerprint,
      title: String(ann.summary ?? name).slice(0, 200),
      description: String(ann.description ?? ann.message ?? ''),
      type: 'bug',
      priority: grafanaSeverityToPriority(labels.severity),
      labels: ['grafana', ...(labels.alertname ? [labels.alertname] : [])],
      resolved: (a.status ?? p.status) === 'resolved',
    };
  });
}
