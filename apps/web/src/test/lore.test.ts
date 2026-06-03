// SPDX-License-Identifier: GPL-3.0-or-later
// The lore easter egg: a styled console banner stamped at boot. No UI, so we just assert
// it logs (and that the no-console early-return branch is safe).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { consoleBoot } from '../ui/lore';

describe('consoleBoot', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs the boarding-pass boot banner without throwing', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => consoleBoot()).not.toThrow();
    expect(log).toHaveBeenCalledTimes(1);
    // The first arg carries the banner text + the lore lines.
    const [banner] = log.mock.calls[0]!;
    expect(banner).toContain('gira-scrumlord');
    expect(banner).toContain('sauron');
    expect(banner).toContain('velociraptor');
    // Plus the three %c style argument strings.
    expect(log.mock.calls[0]!.length).toBe(4);
  });

  it('is a no-op (and does not throw) when console is unavailable', () => {
    const original = globalThis.console;
    // @ts-expect-error — deliberately removing console to exercise the guard branch.
    delete globalThis.console;
    try {
      expect(() => consoleBoot()).not.toThrow();
    } finally {
      globalThis.console = original;
    }
  });
});
