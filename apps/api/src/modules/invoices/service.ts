// SPDX-License-Identifier: GPL-3.0-or-later
// Invoicing. Turn accrued cost into a frozen bill. Generation snapshots the
// resolved rate into each line and claims the worklogs it bills, so an invoice
// is a historical record — not a live recomputation — and no hour is billed twice.

import { type Prisma, type Rate, prisma } from '@gira/db';
import { type ResolvedRate, accruedCents, resolveRate } from '@gira/domain';
import type { GenerateInvoice, InvoiceListItemView, InvoiceView } from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import { config } from '../../config.js';
import { badRequest, notFound } from '../../lib/http-error.js';
import { runSerializable } from '../../lib/tx.js';

const toResolved = (r: Rate | null | undefined): ResolvedRate | null =>
  r ? { hourlyCents: r.hourlyCents, currency: r.currency } : null;

// Offset (ms) between the given timezone's wall clock and UTC at a specific instant.
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value;
  const asUTC = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  return asUTC - instant.getTime();
}

/**
 * Convert a calendar day (taken from a UTC-midnight Date) into the UTC instant for
 * the START or END of that same calendar day in BILLING_TIMEZONE. This is what makes
 * an invoice's period agree with the monthly rollup, which buckets worklogs by
 * calendar month in BILLING_TIMEZONE — without it, a worklog logged just after
 * midnight local time near a month boundary lands in different buckets (the monthly
 * view counts it, the UTC-naive invoice missed it, or vice-versa).
 */
function zonedDayBoundaryUtc(day: Date, end: boolean, timeZone: string): Date {
  const y = day.getUTCFullYear();
  const mo = day.getUTCMonth();
  const d = day.getUTCDate();
  const guess = end
    ? Date.UTC(y, mo, d, 23, 59, 59, 999)
    : Date.UTC(y, mo, d, 0, 0, 0, 0);
  // One offset correction is enough at month boundaries (Madrid's DST switch is at
  // 02:00/03:00, never at the 00:00 boundary we care about).
  return new Date(guess - tzOffsetMs(new Date(guess), timeZone));
}

// What we load to map an invoice to its view.
const invoiceInclude = {
  lines: { orderBy: { issueKey: 'asc' } },
  client: { select: { name: true } },
} satisfies Prisma.InvoiceInclude;

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

function toInvoiceListItem(i: InvoiceWithRelations): InvoiceListItemView {
  return {
    id: i.id,
    number: i.number,
    externalInvoiceRef: i.externalInvoiceRef,
    clientId: i.clientId,
    clientName: i.client.name,
    status: i.status,
    currency: i.currency,
    subtotalCents: i.subtotalCents,
    periodStart: i.periodStart?.toISOString() ?? null,
    periodEnd: i.periodEnd?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
    issuedAt: i.issuedAt?.toISOString() ?? null,
    paidAt: i.paidAt?.toISOString() ?? null,
  };
}

export function toInvoiceView(i: InvoiceWithRelations): InvoiceView {
  return {
    ...toInvoiceListItem(i),
    notes: i.notes,
    lines: i.lines.map((l) => ({
      id: l.id,
      issueKey: l.issueKey,
      description: l.description,
      minutes: l.minutes,
      hourlyCents: l.hourlyCents,
      amountCents: l.amountCents,
    })),
  };
}

async function loadInvoiceOr404(id: string): Promise<InvoiceWithRelations> {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
  if (!invoice) throw notFound('invoice not found');
  return invoice;
}

export async function getInvoice(id: string): Promise<InvoiceWithRelations> {
  return loadInvoiceOr404(id);
}

export async function listClientInvoices(clientId: string): Promise<InvoiceListItemView[]> {
  const invoices = await prisma.invoice.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    include: invoiceInclude,
  });
  return invoices.map(toInvoiceListItem);
}

/**
 * Generate a draft invoice. Pulls every billable, not-yet-invoiced worklog for the
 * client (optionally bounded by period), groups by issue, and writes one frozen
 * line per issue. Fixed-price issues bill their price once — on the first invoice
 * that touches them; later invoices consume their hours without re-charging.
 */
export async function generateInvoice(
  clientId: string,
  input: GenerateInvoice,
  actorId: string,
): Promise<InvoiceView> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, currency: true },
  });
  if (!client) throw notFound('client not found');

  // Period bounds are interpreted in BILLING_TIMEZONE (not UTC) so the worklogs an
  // annex bills are exactly the ones the monthly rollup attributes to that month.
  const loggedAt: Prisma.DateTimeFilter = {};
  if (input.periodStart) loggedAt.gte = zonedDayBoundaryUtc(input.periodStart, false, config.BILLING_TIMEZONE);
  if (input.periodEnd) loggedAt.lte = zonedDayBoundaryUtc(input.periodEnd, true, config.BILLING_TIMEZONE);

  // Serializable + retry: the annex number is derived from the current max for the
  // year, and two concurrent generates reading the same max would otherwise produce
  // a duplicate number (unique-constraint 500). SSI aborts the loser, which retries.
  const invoice = await runSerializable(async (tx) => {
    const worklogs = await tx.worklog.findMany({
      where: {
        billable: true,
        invoiceId: null,
        issue: { project: { clientId } },
        ...(input.periodStart || input.periodEnd ? { loggedAt } : {}),
      },
      select: { id: true, minutes: true, issueId: true },
    });

    if (worklogs.length === 0) {
      throw badRequest('no billable, un-invoiced work found for this client and period');
    }

    const byIssue = new Map<string, { minutes: number }>();
    for (const w of worklogs) {
      const g = byIssue.get(w.issueId) ?? { minutes: 0 };
      g.minutes += w.minutes;
      byIssue.set(w.issueId, g);
    }
    const issueIds = [...byIssue.keys()];

    const issues = await tx.issue.findMany({
      where: { id: { in: issueIds } },
      select: {
        id: true,
        key: true,
        title: true,
        billingMode: true,
        fixedPriceCents: true,
        projectId: true,
      },
    });
    const projectIds = [...new Set(issues.map((i) => i.projectId))];

    const [issueRates, projectRates, clientRate, defaultRate, priorClaims] = await Promise.all([
      tx.rate.findMany({ where: { issueId: { in: issueIds } } }),
      tx.rate.findMany({ where: { projectId: { in: projectIds } } }),
      tx.rate.findUnique({ where: { clientId } }),
      tx.rate.findFirst({ where: { scope: 'default' } }),
      // Issues whose hours were already billed on a prior invoice (fixed price guard).
      tx.worklog.findMany({
        where: { issueId: { in: issueIds }, invoiceId: { not: null } },
        select: { issueId: true },
        distinct: ['issueId'],
      }),
    ]);
    const issueRateById = new Map(issueRates.map((r) => [r.issueId, r]));
    const projectRateById = new Map(projectRates.map((r) => [r.projectId, r]));
    const alreadyBilled = new Set(priorClaims.map((w) => w.issueId));

    const lineData: Prisma.InvoiceLineCreateWithoutInvoiceInput[] = [];
    const unrated: string[] = [];
    const unpriced: string[] = [];
    const mismatched: string[] = [];
    let subtotal = 0;
    for (const issue of issues.sort((a, b) => a.key.localeCompare(b.key))) {
      const minutes = byIssue.get(issue.id)?.minutes ?? 0;

      if (issue.billingMode === 'fixed') {
        if (alreadyBilled.has(issue.id)) continue; // price already charged; just consume hours
        if (issue.fixedPriceCents == null) {
          // A fixed-price issue with no price would silently bill €0 — refuse, same
          // as the no-hourly-rate guard below.
          unpriced.push(issue.key);
          continue;
        }
        const amount = issue.fixedPriceCents;
        subtotal += amount;
        lineData.push({
          issueId: issue.id,
          issueKey: issue.key,
          description: `${issue.title} · precio fijo / fixed price`,
          minutes,
          hourlyCents: null,
          amountCents: amount,
        });
        continue;
      }

      const resolved = resolveRate({
        issue: toResolved(issueRateById.get(issue.id)),
        project: toResolved(projectRateById.get(issue.projectId)),
        client: toResolved(clientRate),
        fallback: toResolved(defaultRate),
      });
      const hourlyCents = resolved?.hourlyCents ?? null;
      if (hourlyCents == null) {
        // Billable hours with no rate at any scope would silently bill €0 — refuse.
        unrated.push(issue.key);
        continue;
      }
      if (resolved && resolved.currency !== client.currency) {
        // Billing a foreign-currency rate's numeric value under the client's
        // currency label would silently overstate/understate the bill. Refuse.
        mismatched.push(`${issue.key} (${resolved.currency})`);
        continue;
      }
      const amount = accruedCents({ billingMode: 'hourly', billableMinutes: minutes, hourlyCents });
      subtotal += amount;
      lineData.push({
        issueId: issue.id,
        issueKey: issue.key,
        description: issue.title,
        minutes,
        hourlyCents,
        amountCents: amount,
      });
    }

    if (unrated.length > 0) {
      throw badRequest(
        `no hourly rate configured for ${unrated.join(', ')} — set a rate before invoicing`,
      );
    }
    if (unpriced.length > 0) {
      throw badRequest(
        `no fixed price set for ${unpriced.join(', ')} — set a fixed price before invoicing`,
      );
    }
    if (mismatched.length > 0) {
      throw badRequest(
        `rate currency mismatch for ${mismatched.join(', ')} — rates must be in ${client.currency}`,
      );
    }

    // ANX = non-fiscal billing annex (the fiscal invoice is issued via TicketBAI).
    const year = new Date().getFullYear();
    // MAX-based (not count-based): deleting a draft must NOT cause the sequence to
    // reuse a still-existing number. Take the highest existing ANX-YYYY-NNNN and +1.
    const last = await tx.invoice.findFirst({
      where: { number: { startsWith: `ANX-${year}-` } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const lastSeq = last ? Number.parseInt(last.number.slice(`ANX-${year}-`.length), 10) || 0 : 0;
    const number = `ANX-${year}-${String(lastSeq + 1).padStart(4, '0')}`;

    const created = await tx.invoice.create({
      data: {
        number,
        clientId,
        status: 'draft',
        currency: client.currency,
        subtotalCents: subtotal,
        periodStart: input.periodStart ?? null,
        periodEnd: input.periodEnd ?? null,
        notes: input.notes ?? null,
        createdById: actorId,
        lines: { create: lineData },
      },
      include: invoiceInclude,
    });

    // Claim every candidate worklog (even fixed-issue hours with no line) so it
    // can't land on a second invoice. Deleting/voiding this invoice frees them.
    await tx.worklog.updateMany({
      where: { id: { in: worklogs.map((w) => w.id) } },
      data: { invoiceId: created.id },
    });

    await recordAudit(tx, {
      actorId,
      action: 'invoice.generate',
      entityType: 'Invoice',
      entityId: created.id,
      after: { number, subtotalCents: subtotal, lines: lineData.length },
    });

    return created;
  });

  return toInvoiceView(invoice);
}

/** Record (or clear) the external TicketBAI fiscal-invoice reference on an annex. */
export async function setInvoiceExternalRef(
  id: string,
  externalInvoiceRef: string | null,
  actorId: string,
): Promise<InvoiceView> {
  const invoice = await loadInvoiceOr404(id);
  const updated = await prisma.invoice.update({
    where: { id },
    data: { externalInvoiceRef: externalInvoiceRef || null },
    include: invoiceInclude,
  });
  await recordAudit(prisma, {
    actorId,
    action: 'invoice.external_ref',
    entityType: 'Invoice',
    entityId: id,
    before: { externalInvoiceRef: invoice.externalInvoiceRef },
    after: { externalInvoiceRef: updated.externalInvoiceRef },
  });
  return toInvoiceView(updated);
}

export async function issueInvoice(id: string, actorId: string): Promise<InvoiceView> {
  const invoice = await loadInvoiceOr404(id);
  if (invoice.status !== 'draft') throw badRequest('only a draft invoice can be issued');
  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: 'issued', issuedAt: new Date() },
    include: invoiceInclude,
  });
  await recordAudit(prisma, {
    actorId,
    action: 'invoice.issue',
    entityType: 'Invoice',
    entityId: id,
    before: { status: 'draft' },
    after: { status: 'issued', number: updated.number },
  });
  return toInvoiceView(updated);
}

export async function payInvoice(id: string, actorId: string): Promise<InvoiceView> {
  const invoice = await loadInvoiceOr404(id);
  if (invoice.status !== 'issued') throw badRequest('only an issued invoice can be marked paid');
  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: 'paid', paidAt: new Date() },
    include: invoiceInclude,
  });
  await recordAudit(prisma, {
    actorId,
    action: 'invoice.pay',
    entityType: 'Invoice',
    entityId: id,
    before: { status: 'issued' },
    after: { status: 'paid', number: updated.number },
  });
  return toInvoiceView(updated);
}

/** Cancel an invoice and release its worklogs back to the un-invoiced pool. */
export async function voidInvoice(id: string, actorId: string): Promise<InvoiceView> {
  const invoice = await loadInvoiceOr404(id);
  if (invoice.status === 'paid') throw badRequest('a paid invoice cannot be voided');
  if (invoice.status === 'void') throw badRequest('invoice is already void');
  const updated = await prisma.$transaction(async (tx) => {
    await tx.worklog.updateMany({ where: { invoiceId: id }, data: { invoiceId: null } });
    const u = await tx.invoice.update({
      where: { id },
      data: { status: 'void' },
      include: invoiceInclude,
    });
    await recordAudit(tx, {
      actorId,
      action: 'invoice.void',
      entityType: 'Invoice',
      entityId: id,
      before: { status: invoice.status },
      after: { status: 'void' },
    });
    return u;
  });
  return toInvoiceView(updated);
}

/** Delete a draft. Cascades lines; the worklog FK is SetNull, freeing the hours. */
export async function deleteInvoice(id: string, actorId: string): Promise<void> {
  const invoice = await loadInvoiceOr404(id);
  if (invoice.status !== 'draft') throw badRequest('only a draft invoice can be deleted');
  await prisma.$transaction(async (tx) => {
    await tx.worklog.updateMany({ where: { invoiceId: id }, data: { invoiceId: null } });
    await tx.invoice.delete({ where: { id } });
    await recordAudit(tx, {
      actorId,
      action: 'invoice.delete',
      entityType: 'Invoice',
      entityId: id,
      before: { number: invoice.number, status: 'draft' },
    });
  });
}
