// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { centsToDecimal, toCsv } from '../lib/csv';

describe('toCsv', () => {
  it('joins cells with commas and rows with CRLF', () => {
    expect(
      toCsv([
        ['a', 'b'],
        [1, 2],
      ]),
    ).toBe('a,b\r\n1,2');
  });

  it('quotes cells containing commas, quotes, or newlines (RFC-4180)', () => {
    expect(toCsv([['a,b', 'he said "hi"', 'line\nbreak']])).toBe(
      '"a,b","he said ""hi""","line\nbreak"',
    );
  });

  it('renders null/undefined as empty cells', () => {
    expect(toCsv([[null, undefined, 0]])).toBe(',,0');
  });

  it('neutralizes formula-injection text (= + - @) by prefixing apostrophe + quoting', () => {
    expect(toCsv([['=HYPERLINK("http://evil","clickme")']])).toBe(
      '"\'=HYPERLINK(""http://evil"",""clickme"")"',
    );
    expect(toCsv([['@SUM(A1)']])).toBe('"\'@SUM(A1)"');
    expect(toCsv([['+1(800)555']])).toBe('"\'+1(800)555"');
  });

  it('does not mangle real negative numbers (string or number)', () => {
    // A genuine negative amount must stay numeric, not become text.
    expect(toCsv([['-7.40', -7.4]])).toBe('-7.40,-7.4');
  });
});

describe('centsToDecimal', () => {
  it('formats integer cents as a 2-decimal number string', () => {
    expect(centsToDecimal(74000)).toBe('740.00');
    expect(centsToDecimal(6000)).toBe('60.00');
    expect(centsToDecimal(0)).toBe('0.00');
  });
});
