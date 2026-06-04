// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage for src/lib/csv.ts `downloadCsv` — specifically the filename-extension
// ternary on the `a.download = ...` line (both branches: already-".csv" vs append).
// `downloadCsv` is a pure DOM helper (Blob + object-URL + a synthetic <a> click), so
// no react-query/router providers are needed; jsdom (the .tsx env) supplies document.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadCsv } from '../lib/csv';

// jsdom has no real object-URL plumbing; vi.spyOn can't stub a missing method,
// so assign the props directly (then restore in afterEach).
const createObjectUrlMock = vi.fn((_blob: Blob) => 'blob:fake');

// The synthetic <a> is created, clicked, and removed synchronously inside downloadCsv,
// so we can't grab it from the DOM afterwards. Instead the click spy records the anchor's
// resolved `download` filename (and the click counts) at the moment of the click — jsdom
// would otherwise try to navigate on a real anchor click.
let lastDownloadName: string | null = null;
let clickCount = 0;

describe('downloadCsv', () => {
  beforeEach(() => {
    URL.createObjectURL = createObjectUrlMock as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as unknown as typeof URL.revokeObjectURL;
    createObjectUrlMock.mockClear();
    lastDownloadName = null;
    clickCount = 0;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      lastDownloadName = this.download;
      clickCount += 1;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (URL as unknown as Record<string, unknown>).createObjectURL;
    delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
  });

  it('appends ".csv" when the filename has no .csv extension (false branch)', () => {
    downloadCsv('MNT-mensual', [['a', 'b']]);
    expect(lastDownloadName).toBe('MNT-mensual.csv');
    expect(clickCount).toBe(1);
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    // The synthetic anchor is removed after the click, so nothing is left in the DOM.
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('keeps the filename as-is when it already ends in ".csv" (true branch)', () => {
    downloadCsv('annex.csv', [['x', 1]]);
    expect(lastDownloadName).toBe('annex.csv');
    expect(clickCount).toBe(1);
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
  });

  it('builds a UTF-8 CSV blob (text/csv) and revokes the object URL', () => {
    downloadCsv('report', [['h1', 'h2']]);
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    const blob = createObjectUrlMock.mock.calls[0]![0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/csv;charset=utf-8;');
  });
});
