// SPDX-License-Identifier: GPL-3.0-or-later
// Guards the PWA static assets: a valid installable manifest and a service worker that is
// safe (never caches the cookie-authed /api). These ship from apps/web/public.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const pub = (f: string) => readFileSync(resolve(here, '../../public', f), 'utf8');

describe('PWA assets', () => {
  it('ships a valid, installable web manifest', () => {
    const m = JSON.parse(pub('manifest.webmanifest'));
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBe('/');
    expect(m.display).toBe('standalone');
    expect(Array.isArray(m.icons)).toBe(true);
    expect(m.icons.length).toBeGreaterThan(0);
    // a maskable icon that actually exists in public/
    const maskable = m.icons.find((i: { purpose?: string }) =>
      (i.purpose ?? '').includes('maskable'),
    );
    expect(maskable).toBeTruthy();
    expect(() => pub(maskable.src.replace(/^\//, ''))).not.toThrow();
  });

  it('ships a service worker that never caches /api and cleans old caches', () => {
    const sw = pub('sw.js');
    expect(sw).toMatch(/addEventListener\(['"]fetch['"]/);
    expect(sw).toMatch(/addEventListener\(['"]install['"]/);
    expect(sw).toMatch(/addEventListener\(['"]activate['"]/);
    // The critical safety invariant: /api is bypassed, not cached.
    expect(sw).toMatch(/\/api\//);
    expect(sw).toMatch(/startsWith\(['"]\/api\/['"]\)/);
    // versioned cache + cleanup on activate
    expect(sw).toMatch(/caches\.delete/);
  });
});
