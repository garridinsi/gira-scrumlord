// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Format integer cents as a currency string using Intl.NumberFormat.
 * Money is always integer minor units — never divide loosely.
 */
export function formatCents(cents: number, currency: string): string {
  // Minor-units factor: most currencies have 2 decimal places (100 cents = 1 unit).
  // We only handle currencies with 2 decimal places here (covers EUR, USD, GBP, etc.).
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format total minutes into "Xh Ym" string.
 * Returns "0m" for zero.
 */
export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format ISO date string to a readable short date.
 */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

/**
 * Format ISO date string to relative time (e.g. "2 days ago").
 */
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}
