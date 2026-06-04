// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage closure for src/modules/intake/service.ts.
// Targets four otherwise-unreached lines (driven via the exported runIntake unit):
//   line 55  — resolveAssignee skips a rule whose matchLabelId is absent from the item's labels
//   line 75  — the missing-project guard (source.projectId points at no project)
//   line 95  — the per-item ensureLabels call inside the batch loop
//   line 114 — the resolve path's update `where: { id: existing.id }`
import { describe, expect, it, beforeEach } from 'vitest';
import type { IntakeSource } from '@gira/db';
import { runIntake } from '../src/modules/intake/service.js';
import { makeUser } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

// Build a real project + intake source and return both ids. A real source row is
// required because createIssue writes Issue.intakeSourceId (an FK) on the create path.
async function setup(): Promise<{ projectId: string; source: IntakeSource }> {
  const reporter = await makeUser({ name: 'Reporter', role: 'admin' });
  const { projectKey } = await seedProject({ reporterId: reporter.id });
  const project = await prisma.project.findUnique({ where: { key: projectKey } });
  const source = await prisma.intakeSource.create({
    data: {
      name: 'cov-source',
      kind: 'generic',
      projectId: project!.id,
      tokenHash: 'cov-intake-token-hash',
    },
  });
  return { projectId: project!.id, source };
}

describe('cov src/modules/intake/service.ts', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('throws "intake source project missing" when the source points at no project (line 75)', async () => {
    const { source } = await setup();
    // Override projectId to a non-existent id: runIntake's first DB call (project lookup)
    // returns null before any source-FK work, so a bogus id alone trips the guard.
    const orphan: IntakeSource = { ...source, projectId: 'no-such-project-id' };

    await expect(runIntake(orphan, [])).rejects.toMatchObject({
      statusCode: 404,
      message: 'intake source project missing',
    });
  });

  it('skips a matchLabelId rule when the item lacks that label, leaving the issue unassigned (lines 55, 95)', async () => {
    const { projectId, source } = await setup();
    const dev = await makeUser({ name: 'On-call', role: 'member' });
    // A label the rule keys on, but which the incoming item will NOT carry.
    const ruleLabel = await prisma.label.create({
      data: { projectId, name: 'needs-triage' },
    });
    await prisma.assignmentRule.create({
      data: { projectId, assigneeId: dev.id, matchLabelId: ruleLabel.id },
    });

    // The item carries a DIFFERENT label set (ensureLabels runs → line 95), so
    // criteria.labelIds excludes ruleLabel.id → resolveAssignee hits the line-55 continue.
    const results = await runIntake(source, [
      { title: 'unlabelled alert', description: 'body', labels: ['other-label'] },
    ]);

    expect(results[0]!.action).toBe('created');
    const issue = await prisma.issue.findUnique({ where: { key: results[0]!.key! } });
    expect(issue!.assigneeId).toBeNull();
  });

  it('closes a known issue when a resolved event arrives for it (line 114)', async () => {
    const { source } = await setup();
    // First, a firing event creates the issue and writes the (source, externalRef) dedup row.
    const created = await runIntake(source, [
      { title: 'flapping alert', description: 'still firing', externalRef: 'cov-ref-1' },
    ]);
    expect(created[0]!.action).toBe('created');

    // Then the matching resolved event hits the existing-and-not-closed update arm.
    const resolved = await runIntake(source, [
      { title: 'flapping alert', description: 'now ok', externalRef: 'cov-ref-1', resolved: true },
    ]);
    expect(resolved[0]!.action).toBe('resolved');

    const issue = await prisma.issue.findUnique({ where: { key: resolved[0]!.key! } });
    expect(issue!.closedAt).not.toBeNull();
  });
});
