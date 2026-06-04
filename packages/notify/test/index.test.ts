// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import * as notify from '../src/index.js';

// Pins + exercises the package's public barrel so a dropped/renamed export fails loudly.
describe('notify barrel (index.ts)', () => {
  it('re-exports the public delivery, ssrf, dispatch, escalation and config surface', () => {
    for (const name of [
      'deliver',
      'sendUserEmail',
      'assertSafeWebhookUrl',
      'assertResolvedHostSafe',
      'isPrivateHost',
      'dispatchEvent',
      'dispatchOutboxBatch',
      'deliverPersonal',
      'resolveChannels',
      'ensureIncident',
      'escalateOpenIncidents',
    ]) {
      expect(typeof (notify as Record<string, unknown>)[name]).toBe('function');
    }
    expect(notify.notifyConfig).toBeTruthy();
  });
});
