// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { sanitizeMarkdown } from './sanitize.js';

describe('sanitizeMarkdown', () => {
  it('strips <script> and other raw HTML tags', () => {
    expect(sanitizeMarkdown('hi <script>alert(1)</script> there')).toBe('hi alert(1) there');
    expect(sanitizeMarkdown('<img src=x onerror=alert(1)>')).toBe('');
    expect(sanitizeMarkdown('a <b>bold</b> word')).toBe('a bold word');
  });

  it('strips HTML comments', () => {
    expect(sanitizeMarkdown('before <!-- evil --> after')).toBe('before  after');
  });

  it('defangs javascript:/data:/vbscript: link + image schemes, keeping the text', () => {
    // The dangerous SCHEME is removed (→ harmless fragment link); execution is neutralized.
    expect(sanitizeMarkdown('[click](javascript:alert(1))')).toBe('[click](#alert(1))');
    expect(sanitizeMarkdown('![x](data:text/html;base64,PHN2Zz4=)')).toBe(
      '![x](#text/html;base64,PHN2Zz4=)',
    );
    expect(sanitizeMarkdown('[a](VBScript:msgbox(1))')).toBe('[a](#msgbox(1))');
    // bare autolink form is stripped entirely as a tag
    expect(sanitizeMarkdown('see <javascript:alert(1)> now')).toBe('see  now');
  });

  it('preserves safe links and ordinary prose/punctuation', () => {
    expect(sanitizeMarkdown('[docs](https://example.com/x)')).toBe('[docs](https://example.com/x)');
    expect(sanitizeMarkdown('[mail](mailto:a@b.com)')).toBe('[mail](mailto:a@b.com)');
    expect(sanitizeMarkdown('[rel](/projects/GIRA)')).toBe('[rel](/projects/GIRA)');
    // prose with comparison operators must NOT be treated as tags
    expect(sanitizeMarkdown('if a < b and c > d then x<3')).toBe('if a < b and c > d then x<3');
    expect(sanitizeMarkdown('# Heading\n\n- bullet\n\n`code`')).toBe(
      '# Heading\n\n- bullet\n\n`code`',
    );
  });

  it('returns empty/empty for empty input', () => {
    expect(sanitizeMarkdown('')).toBe('');
  });

  // --- Regression: single-pass removal can splice two halves into a fresh match ---
  it('strips tags that are reconstructed by an inner removal (fixpoint)', () => {
    // Removing the inner <script> leaves <  + script>  → a new <script> tag.
    expect(sanitizeMarkdown('<<script>script>')).toBe('');
    // Comment splice that reforms a tag after the comment is removed.
    expect(sanitizeMarkdown('<scr<!-- x -->ipt>alert(1)')).toBe('alert(1)');
    // Nested comments must not leave a residual <!-- behind.
    expect(sanitizeMarkdown('<!--<!--a-->-->')).not.toContain('<!--');
  });

  it('defangs a dangerous scheme reconstructed after tag removal', () => {
    // Stripping <x> rejoins `](java` + `script:` into a live javascript: target.
    expect(sanitizeMarkdown('[c](java<x>script:alert(1))')).toBe('[c](#alert(1))');
  });

  // --- Regression: polynomial ReDoS on unterminated comments must complete promptly ---
  it('handles a flood of unterminated comment openers without quadratic blowup', () => {
    const evil = '<!--'.repeat(100_000);
    const start = performance.now();
    const out = sanitizeMarkdown(evil);
    expect(performance.now() - start).toBeLessThan(1000);
    expect(out).toBe('');
  });
});
