// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { sniffContentType } from './sniff.js';

const bytes = (...b: number[]) => new Uint8Array(b);

describe('sniffContentType', () => {
  it('detects PNG by its 8-byte signature', () => {
    expect(sniffContentType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0))).toBe(
      'image/png',
    );
  });
  it('detects JPEG', () => {
    expect(sniffContentType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00))).toBe('image/jpeg');
  });
  it('detects GIF', () => {
    expect(sniffContentType(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe('image/gif');
  });
  it('detects WebP (RIFF…WEBP)', () => {
    expect(
      sniffContentType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50)),
    ).toBe('image/webp');
  });
  it('detects PDF', () => {
    expect(sniffContentType(bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31))).toBe('application/pdf');
  });
  it('treats printable UTF-8 with newlines/tabs as text/plain', () => {
    expect(sniffContentType(new TextEncoder().encode('hello\n\tworld — ñ'))).toBe('text/plain');
  });
  it('rejects an unknown binary blob (NUL/control bytes) → null', () => {
    expect(sniffContentType(bytes(0x00, 0x01, 0x02, 0x03))).toBeNull();
    expect(sniffContentType(bytes())).toBeNull();
  });
  it('rejects a high control char (0x0e–0x1f, not < 0x09) as non-text → null', () => {
    // Exercises the second half of the control-byte guard (c > 0x0d && c < 0x20):
    // a printable 'A' followed by US (0x1f) is not text and matches no magic signature.
    expect(sniffContentType(bytes(0x41, 0x1f))).toBeNull();
  });
  it('rejects an SVG (it is text-ish but we never allow inline-renderable markup as an image)', () => {
    // An SVG sniffs as text/plain (not an image), so it can only ever be force-downloaded
    // as text/plain — never served as image/svg+xml that a browser would execute.
    expect(sniffContentType(new TextEncoder().encode('<svg onload=alert(1)></svg>'))).toBe(
      'text/plain',
    );
  });
});
