// SPDX-License-Identifier: GPL-3.0-or-later
// Turn normalized external events into issues: ensure labels, auto-assign by
// rule, dedup on (source, externalRef), and create via the same createIssue path
// (so emergency intakes flow into M3 paging automatically).

import { type IntakeSource, type IssueType, type Priority, prisma } from '@gira/db';
import type { NormalizedIntake } from '@gira/chaos';
import { notFound } from '../../lib/http-error.js';
import { createIssue } from '../issues/service.js';

const SYSTEM_EMAIL = 'system@gira.local';

// One inbound webhook must not be able to mint an unbounded number of issues. A single
// 2 MB Grafana payload can carry thousands of minimal alert objects; each becomes its own
// createIssue transaction (+ label upserts + rule scans + possible emergency paging), a
// cheap amplification/DoS that also floods the project with junk. Cap items per request —
// the byte-size body limit alone does not bound the item COUNT. Overflow is signalled, not
// silently dropped, so a legitimate over-cap sender knows to split the batch.
const MAX_INTAKE_ITEMS_PER_REQUEST = 100;

async function systemUser(): Promise<{ id: string }> {
  return prisma.user.upsert({
    where: { email: SYSTEM_EMAIL },
    create: { email: SYSTEM_EMAIL, name: 'gira intake', kind: 'staff', role: 'member' },
    update: {},
    select: { id: true },
  });
}

async function ensureLabels(projectId: string, names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const label = await prisma.label.upsert({
      where: { projectId_name: { projectId, name } },
      create: { projectId, name },
      update: {},
      select: { id: true },
    });
    ids.push(label.id);
  }
  return ids;
}

async function resolveAssignee(
  projectId: string,
  criteria: { type: IssueType; priority: Priority; labelIds: string[] },
): Promise<string | null> {
  const rules = await prisma.assignmentRule.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
  });
  for (const r of rules) {
    if (r.matchType && r.matchType !== criteria.type) continue;
    if (r.matchPriority && r.matchPriority !== criteria.priority) continue;
    if (r.matchLabelId && !criteria.labelIds.includes(r.matchLabelId)) continue;
    return r.assigneeId;
  }
  return null;
}

export interface IntakeResult {
  action: 'created' | 'resolved' | 'duplicate' | 'ignored' | 'error' | 'overflow';
  key?: string;
  dropped?: number;
}

export async function runIntake(
  source: IntakeSource,
  intakes: NormalizedIntake[],
): Promise<IntakeResult[]> {
  const project = await prisma.project.findUnique({
    where: { id: source.projectId },
    select: { id: true, key: true },
  });
  if (!project) throw notFound('intake source project missing');
  const reporter = await systemUser();
  const results: IntakeResult[] = [];

  // Bound the work a single request can trigger; signal (don't silently drop) overflow.
  const capped = intakes.slice(0, MAX_INTAKE_ITEMS_PER_REQUEST);
  if (intakes.length > MAX_INTAKE_ITEMS_PER_REQUEST) {
    console.warn('[intake] payload exceeded item cap; extra items not processed', {
      sourceId: source.id,
      received: intakes.length,
      cap: MAX_INTAKE_ITEMS_PER_REQUEST,
    });
  }

  for (const n of capped) {
    // Per-item isolation: a single malformed event must not abort the whole batch
    // (and, with dedup written atomically, a retried batch re-dedups cleanly).
    try {
      const type = n.type ?? source.defaultType;
      const priority = n.priority ?? source.defaultPriority;
      const labelIds = await ensureLabels(project.id, n.labels ?? []);

      // dedup on (source, externalRef)
      const existing = n.externalRef
        ? await prisma.issue.findUnique({
            where: {
              intakeSourceId_externalRef: { intakeSourceId: source.id, externalRef: n.externalRef },
            },
          })
        : null;

      if (existing) {
        if (n.resolved && !existing.closedAt) {
          const done = await prisma.status.findFirst({
            where: { projectId: project.id, category: 'done' },
            orderBy: { order: 'asc' },
          });
          await prisma.issue.update({
            where: { id: existing.id },
            data: { closedAt: new Date(), ...(done ? { statusId: done.id } : {}) },
          });
          results.push({ action: 'resolved', key: existing.key });
        } else {
          results.push({ action: 'duplicate', key: existing.key });
        }
        continue;
      }

      if (n.resolved) {
        results.push({ action: 'ignored' }); // resolved event for an unknown issue
        continue;
      }

      const assigneeId = await resolveAssignee(project.id, { type, priority, labelIds });
      // The dedup key is written inside createIssue's tx, so the (source, ref) row is
      // never momentarily null between create and a follow-up update.
      const issue = await createIssue(
        {
          projectKey: project.key,
          title: n.title,
          description: n.description,
          type,
          priority,
          billingMode: 'hourly',
          assigneeId: assigneeId ?? undefined,
          labelIds,
        },
        reporter.id,
        { externalRef: n.externalRef ?? null, intakeSourceId: source.id },
      );
      results.push({ action: 'created', key: issue.key });
    } catch (err) {
      console.error('[intake] item failed', {
        sourceId: source.id,
        externalRef: n.externalRef,
        err,
      });
      results.push({ action: 'error' });
    }
  }

  if (intakes.length > MAX_INTAKE_ITEMS_PER_REQUEST) {
    results.push({ action: 'overflow', dropped: intakes.length - MAX_INTAKE_ITEMS_PER_REQUEST });
  }

  return results;
}
