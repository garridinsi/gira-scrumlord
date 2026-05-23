// SPDX-License-Identifier: GPL-3.0-or-later
// Money is integer cents + ISO currency. The EG design shows it code-prefixed,
// ES decimal style: "EUR 1.671,00".

export function formatMoney(cents: number, currency: string): string {
  const n = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
  return `${currency} ${n}`;
}

/** Compact form for tight chips: "EUR 175/h" (no decimals). */
export function formatRatePerHour(hourlyCents: number, currency: string): string {
  return `${currency} ${Math.round(hourlyCents / 100)}/h`;
}
