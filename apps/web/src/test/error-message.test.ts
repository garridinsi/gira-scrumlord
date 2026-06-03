// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { errorMessage } from '../api/client';

describe('errorMessage (API error envelope → human text)', () => {
  it('surfaces an HttpError message verbatim', () => {
    expect(errorMessage({ error: 'only a draft annex can be issued' }, 400)).toBe(
      'only a draft annex can be issued',
    );
  });

  it('renders the first Zod issue as "path: message"', () => {
    const body = {
      error: 'validation_error',
      issues: [{ path: ['clientId'], message: 'Required' }],
    };
    expect(errorMessage(body, 400)).toBe('clientId: Required');
  });

  it('humanizes known machine codes', () => {
    expect(errorMessage({ error: 'already_exists' }, 409)).toMatch(/already exists/i);
    expect(errorMessage({ error: 'not_found' }, 404)).toMatch(/not found/i);
  });

  it('prefers an explicit message field when present', () => {
    expect(errorMessage({ error: 'validation_error', message: 'body required' }, 400)).toBe(
      'body required',
    );
  });

  it('falls back to HTTP status when the body is unusable', () => {
    expect(errorMessage(null, 500)).toBe('HTTP 500');
    expect(errorMessage('weird', 502)).toBe('HTTP 502');
  });
});
