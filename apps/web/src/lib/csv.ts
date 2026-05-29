// SPDX-License-Identifier: GPL-3.0-or-later
// Client-side CSV export — no backend, no deps. Money is emitted as a plain
// decimal (cents / 100) so spreadsheets parse it as a number; a separate currency
// column carries the ISO code.

type Cell = string | number | null | undefined;

/** Build an RFC-4180 CSV string (CRLF rows, quote-escaped cells). */
export function toCsv(rows: Cell[][]): string {
  const esc = (v: Cell): string => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

/** cents → "740.00" (plain number string, no symbol). */
export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Trigger a browser download of the rows as a CSV file (BOM so Excel reads UTF-8). */
export function downloadCsv(filename: string, rows: Cell[][]): void {
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
