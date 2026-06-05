// SPDX-License-Identifier: GPL-3.0-or-later
// Money. Always integer minor units (cents). Never floats.

export interface ResolvedRate {
  hourlyCents: number;
  currency: string;
}

export interface RateChain {
  issue?: ResolvedRate | null;
  project?: ResolvedRate | null;
  client?: ResolvedRate | null;
  fallback?: ResolvedRate | null;
}

/**
 * Resolve the effective hourly rate by precedence: issue → project → client → default.
 * The first defined rate wins. Returns null if nothing is configured.
 */
export function resolveRate(chain: RateChain): ResolvedRate | null {
  return chain.issue ?? chain.project ?? chain.client ?? chain.fallback ?? null;
}

export interface AccruedInput {
  billingMode: 'hourly' | 'fixed' | 'covered';
  fixedPriceCents?: number | null;
  billableMinutes: number;
  hourlyCents?: number | null;
}

/**
 * Accrued cost in cents. Covered issues (work under an agreement, e.g. a maintenance
 * retainer) never bill — always 0. Fixed-price issues return their fixed price regardless
 * of logged time. Hourly issues bill (billable minutes ÷ 60) × hourly rate, rounded to the
 * nearest cent, or 0 when no rate resolves.
 */
export function accruedCents(input: AccruedInput): number {
  if (input.billingMode === 'covered') {
    return 0;
  }
  if (input.billingMode === 'fixed') {
    return input.fixedPriceCents ?? 0;
  }
  if (input.hourlyCents == null) {
    return 0;
  }
  return Math.round((input.billableMinutes / 60) * input.hourlyCents);
}
