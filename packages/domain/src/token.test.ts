// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { generateToken, hashToken, safeEqualHash } from './token.js';

describe('token', () => {
  it('hashToken is deterministic and hex', () => {
    expect(hashToken('hello')).toBe(hashToken('hello'));
    expect(hashToken('hello')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generateToken returns a raw secret whose hash matches hashToken', () => {
    const { raw, hash } = generateToken();
    expect(hash).toBe(hashToken(raw));
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
  });

  it('generates distinct tokens each call', () => {
    expect(generateToken().raw).not.toBe(generateToken().raw);
  });

  it('safeEqualHash compares correctly', () => {
    const h = hashToken('x');
    expect(safeEqualHash(h, h)).toBe(true);
    expect(safeEqualHash(h, hashToken('y'))).toBe(false);
    expect(safeEqualHash(h, 'short')).toBe(false);
  });
});
