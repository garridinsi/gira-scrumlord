// SPDX-License-Identifier: GPL-3.0-or-later
// N2: determine an uploaded file's REAL type from its leading bytes — never trust the
// client's declared content-type or extension. Returns one of a small allowlist, or null
// for anything unrecognized (which the upload route rejects). SVG is deliberately NOT
// allowed (it can carry script); only raster images, PDF, and plain text.

export type SniffedType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/webp'
  | 'application/pdf'
  | 'text/plain';

export function sniffContentType(buf: Uint8Array): SniffedType | null {
  const at = (i: number) => buf[i];
  const sig = (...bytes: number[]) => bytes.every((v, i) => buf[i] === v);

  if (sig(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (sig(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (sig(0x47, 0x49, 0x46, 0x38)) return 'image/gif'; // GIF8
  // RIFF....WEBP
  if (
    sig(0x52, 0x49, 0x46, 0x46) &&
    at(8) === 0x57 &&
    at(9) === 0x45 &&
    at(10) === 0x42 &&
    at(11) === 0x50
  )
    return 'image/webp';
  if (sig(0x25, 0x50, 0x44, 0x46)) return 'application/pdf'; // %PDF
  if (isProbablyText(buf)) return 'text/plain';
  return null;
}

// Heuristic: non-empty, no NUL, and no disallowed C0 control bytes (tab/LF/CR are fine).
// Bytes ≥ 0x80 are allowed (UTF-8 multibyte). Runs only after the binary signatures miss.
function isProbablyText(buf: Uint8Array): boolean {
  if (buf.length === 0) return false;
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i]!;
    if (c === 0x00) return false;
    if (c < 0x09 || (c > 0x0d && c < 0x20)) return false;
  }
  return true;
}
