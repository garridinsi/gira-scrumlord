// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { invoiceLineKind } from './invoice.js';

// invoiceLineKind derives an annex line's billing nature purely from its frozen
// fields, so a single annex can mix T&M, fixed-price and covered work and still
// label each line. These cases pin every branch of that derivation.
describe('invoiceLineKind', () => {
  it('classifies the RETAINER sentinel as the retainer fee, regardless of amount', () => {
    expect(invoiceLineKind({ issueKey: 'RETAINER', hourlyCents: null, amountCents: 500_000 })).toBe(
      'retainer',
    );
    // The sentinel wins even if its shape would otherwise read as covered (€0).
    expect(invoiceLineKind({ issueKey: 'RETAINER', hourlyCents: null, amountCents: 0 })).toBe(
      'retainer',
    );
  });

  it('classifies a line carrying an hourly rate as billable T&M', () => {
    expect(invoiceLineKind({ issueKey: 'ACME-1', hourlyCents: 6000, amountCents: 12_000 })).toBe(
      'billable',
    );
    // A zero amount but a non-null rate is still billable (e.g. 0 billable minutes).
    expect(invoiceLineKind({ issueKey: 'ACME-2', hourlyCents: 6000, amountCents: 0 })).toBe(
      'billable',
    );
  });

  it('classifies a null-rate line with a positive amount as fixed price', () => {
    expect(invoiceLineKind({ issueKey: 'ACME-3', hourlyCents: null, amountCents: 50_000 })).toBe(
      'fixed',
    );
  });

  it('classifies a null-rate €0 line as covered', () => {
    expect(invoiceLineKind({ issueKey: 'ACME-4', hourlyCents: null, amountCents: 0 })).toBe(
      'covered',
    );
  });
});
