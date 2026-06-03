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
});
