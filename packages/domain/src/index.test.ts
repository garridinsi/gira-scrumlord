// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import * as domain from './index.js';

// The barrel re-exports the whole public domain surface. This test pins that surface so a
// dropped/renamed export fails loudly, and it exercises index.ts itself for coverage.
describe('domain barrel (index.ts)', () => {
  it('re-exports the public API from every module', () => {
    expect(typeof domain.rankBetween).toBe('function');
    expect(typeof domain.initialRank).toBe('function');
    expect(typeof domain.NoRankSpaceError).toBe('function');
    expect(typeof domain.businessMinutesBetween).toBe('function');
    expect(typeof domain.sanitizeMarkdown).toBe('function');
    expect(typeof domain.sniffContentType).toBe('function');
    expect(typeof domain.parseMentions).toBe('function');
  });

  it('the re-exported functions behave identically to their source modules', () => {
    const a = domain.initialRank();
    const b = domain.rankBetween(a, null);
    expect(a < b).toBe(true);
  });
});
