// SPDX-License-Identifier: GPL-3.0-or-later
// Lore easter egg: the boarding-pass boot stamp in the console. Never in the UI.

export function consoleBoot(): void {
  if (typeof console === 'undefined') return;
  console.log(
    '%c gira-scrumlord %c v0.1.0 · M1 %c\n' +
      '// scrumlord · pg-boss worker · 4 jobs queued\n' +
      '// sauron · audit log · port :666 · watching\n' +
      '// chaos · adapters · M4 · works by accident\n' +
      "// el roadmap no se lee, se siente. pero lo escribimos igual,\n" +
      '// porque el velociraptor insistió.',
    'background:#0b1620;color:#f5c400;padding:2px 6px;font:700 13px/1.2 monospace',
    'background:#f5c400;color:#0b1620;padding:2px 6px;font:600 12px/1.2 monospace',
    'color:#6a7280;font:500 11px/1.5 monospace',
  );
}
