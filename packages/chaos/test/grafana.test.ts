// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { grafanaSeverityToPriority, parseGrafana } from '../src/grafana.js';

describe('grafana', () => {
  it('maps severities to priorities', () => {
    expect(grafanaSeverityToPriority('critical')).toBe('emergency');
    expect(grafanaSeverityToPriority('high')).toBe('urgent');
    expect(grafanaSeverityToPriority('warning')).toBe('high');
    expect(grafanaSeverityToPriority('info')).toBe('medium');
    expect(grafanaSeverityToPriority(undefined)).toBe('high');
  });

  it('parses a multi-alert firing payload', () => {
    const intakes = parseGrafana({
      status: 'firing',
      alerts: [
        {
          status: 'firing',
          fingerprint: 'abc123',
          labels: { alertname: 'HighCPU', severity: 'critical' },
          annotations: { summary: 'CPU on fire', description: 'node-1 at 99%' },
        },
        {
          status: 'firing',
          fingerprint: 'def456',
          labels: { alertname: 'DiskWarn', severity: 'warning' },
          annotations: { summary: 'Disk filling up' },
        },
      ],
    });
    expect(intakes).toHaveLength(2);
    expect(intakes[0]).toMatchObject({
      externalRef: 'abc123',
      title: 'CPU on fire',
      priority: 'emergency',
      type: 'bug',
      resolved: false,
    });
    expect(intakes[0]!.labels).toContain('grafana');
    expect(intakes[0]!.labels).toContain('HighCPU');
    expect(intakes[1]).toMatchObject({ externalRef: 'def456', priority: 'high' });
  });

  it('flags resolved alerts', () => {
    const [intake] = parseGrafana({
      alerts: [{ status: 'resolved', fingerprint: 'x', labels: { alertname: 'A', severity: 'critical' } }],
    });
    expect(intake!.resolved).toBe(true);
  });

  it('returns [] for an empty payload', () => {
    expect(parseGrafana({})).toEqual([]);
    expect(parseGrafana(null)).toEqual([]);
  });
});
