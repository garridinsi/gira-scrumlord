// SPDX-License-Identifier: GPL-3.0-or-later
// gira-scrumlord seed — FICTIONAL data only. Never put real client info here.

import { PrismaClient, type Issue, type StatusCategory } from '@prisma/client';

const prisma = new PrismaClient();

/** Evenly-spaced, lexicographically-sortable initial ranks (real inserts use LexoRank midpoints). */
function seedRanks(n: number): string[] {
  const width = 6;
  const step = Math.floor(36 ** width / (n + 1));
  return Array.from({ length: n }, (_, i) => ((i + 1) * step).toString(36).padStart(width, '0'));
}

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);

async function wipe() {
  // Dev-only reset so `pnpm db:seed` is repeatable. Order respects FKs.
  await prisma.$transaction([
    prisma.worklog.deleteMany(),
    prisma.timer.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.rate.deleteMany(),
    prisma.issue.deleteMany(),
    prisma.sprint.deleteMany(),
    prisma.label.deleteMany(),
    prisma.status.deleteMany(),
    prisma.project.deleteMany(),
    prisma.magicLinkToken.deleteMany(),
    prisma.session.deleteMany(),
    prisma.identity.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.outbox.deleteMany(),
    prisma.user.deleteMany(),
    prisma.client.deleteMany(),
  ]);
}

async function main() {
  await wipe();

  // ── client ──────────────────────────────────────────────────────────────
  const acme = await prisma.client.create({
    data: { name: 'Acme Corp', slug: 'acme', currency: 'EUR', notes: 'Buys a lot of anvils.' },
  });

  // ── users (passwordless; identity binds the login method) ─────────────────
  const mkUser = (email: string, name: string, extra: Record<string, unknown> = {}) =>
    prisma.user.create({
      data: {
        email,
        name,
        ...extra,
        identities: { create: { provider: 'magic-link', subject: email, email } },
      },
    });

  const boss = await mkUser('boss@example.test', 'The Scrumlord', { role: 'admin' });
  const rex = await mkUser('rex@example.test', 'Rex (Product Owner)', { role: 'member' });
  await mkUser('wile@acme.example.test', 'Wile E. Coyote', {
    kind: 'client',
    role: 'viewer',
    clientId: acme.id,
  });

  // ── project + workflow ────────────────────────────────────────────────────
  const project = await prisma.project.create({
    data: {
      key: 'GIRA',
      name: 'gira-scrumlord',
      description: 'Building the tool that builds the tool. Recursion is a feature.',
      clientId: acme.id,
    },
  });

  const statusDefs: Array<[string, StatusCategory, number]> = [
    ['Backlog', 'todo', 0],
    ['To Do', 'todo', 1],
    ['In Progress', 'in_progress', 2],
    ['In Review', 'in_progress', 3],
    ['Done', 'done', 4],
  ];
  const statuses = Object.fromEntries(
    await Promise.all(
      statusDefs.map(async ([name, category, order]) => [
        name,
        await prisma.status.create({ data: { projectId: project.id, name, category, order } }),
      ]),
    ),
  ) as Record<string, { id: string }>;

  const labelDefs: Array<[string, string]> = [
    ['bug', '#ef4444'],
    ['feature', '#22c55e'],
    ['chaos', '#8b5cf6'],
    ['lore', '#eab308'],
  ];
  const labels = Object.fromEntries(
    await Promise.all(
      labelDefs.map(async ([name, color]) => [
        name,
        await prisma.label.create({ data: { projectId: project.id, name, color } }),
      ]),
    ),
  ) as Record<string, { id: string }>;

  const sprint = await prisma.sprint.create({
    data: {
      projectId: project.id,
      name: 'Sprint 1 — The Descent',
      goal: 'Summon the core. Light a candle. Do not anger the velociraptor.',
      state: 'active',
      startDate: daysFromNow(-3),
      endDate: daysFromNow(11),
      committedPoints: 23,
    },
  });

  // ── issues ──────────────────────────────────────────────────────────────
  const ranks = seedRanks(8);
  type Seed = {
    title: string;
    type: 'task' | 'bug' | 'story' | 'epic';
    priority: 'low' | 'medium' | 'high' | 'urgent' | 'emergency';
    status: string;
    points?: number;
    inSprint?: boolean;
    assignee?: { id: string };
    labels?: string[];
    closed?: boolean;
    fixedPriceCents?: number;
    description?: string;
  };

  const issueSeeds: Seed[] = [
    {
      title: 'Summon the core',
      type: 'epic',
      priority: 'high',
      status: 'In Progress',
      points: 8,
      inSprint: true,
      assignee: boss,
      labels: ['lore'],
      description: '## The core\nNobody understands it anymore. That is by design.',
    },
    {
      title: 'Passwordless magic-link auth',
      type: 'story',
      priority: 'high',
      status: 'Done',
      points: 5,
      inSprint: true,
      assignee: rex,
      closed: true,
      description: 'Single-use hashed tokens, server sessions, OIDC-ready.',
    },
    {
      title: 'Kanban drag-and-drop',
      type: 'task',
      priority: 'medium',
      status: 'In Progress',
      points: 3,
      inSprint: true,
      assignee: rex,
      labels: ['feature'],
    },
    {
      title: 'Columns explode past 5 cards in In Progress',
      type: 'bug',
      priority: 'medium',
      status: 'To Do',
      points: 2,
      inSprint: true,
      labels: ['bug'],
      fixedPriceCents: 25000,
      description: 'Game mechanic, allegedly. Fixed-price to exorcise it.',
    },
    {
      title: 'Velocity hurricane chart',
      type: 'task',
      priority: 'low',
      status: 'Backlog',
      points: 3,
      labels: ['feature'],
      description: 'The chart is always the same hurricane. Soothing.',
    },
    {
      title: 'Wire Mailpit for dev emails',
      type: 'task',
      priority: 'low',
      status: 'Done',
      points: 1,
      assignee: rex,
      closed: true,
    },
    {
      title: "Sprint won't end, collapses into another",
      type: 'bug',
      priority: 'urgent',
      status: 'In Review',
      points: 5,
      inSprint: true,
      assignee: boss,
      labels: ['bug', 'lore'],
    },
    {
      title: 'PROD DOWN: sauron not watching on 666',
      type: 'bug',
      priority: 'emergency',
      status: 'To Do',
      points: 8,
      assignee: boss,
      labels: ['bug', 'lore'],
      description: '> One does not simply ignore the eye.',
    },
  ];

  const issues: Issue[] = [];
  for (let i = 0; i < issueSeeds.length; i++) {
    const s = issueSeeds[i]!;
    const issue = await prisma.issue.create({
      data: {
        projectId: project.id,
        key: `GIRA-${i + 1}`,
        title: s.title,
        description: s.description ?? '',
        type: s.type,
        priority: s.priority,
        statusId: statuses[s.status]!.id,
        reporterId: boss.id,
        assigneeId: s.assignee?.id ?? null,
        sprintId: s.inSprint ? sprint.id : null,
        storyPoints: s.points ?? null,
        rank: ranks[i]!,
        billingMode: s.fixedPriceCents ? 'fixed' : 'hourly',
        fixedPriceCents: s.fixedPriceCents ?? null,
        closedAt: s.closed ? daysFromNow(-1) : null,
        labels: s.labels ? { connect: s.labels.map((n) => ({ id: labels[n]!.id })) } : undefined,
      },
    });
    issues.push(issue);
  }

  await prisma.project.update({ where: { id: project.id }, data: { issueCounter: issues.length } });

  // ── worklogs (time) ────────────────────────────────────────────────────
  const log = (issueIdx: number, userId: string, minutes: number, note: string) =>
    prisma.worklog.create({
      data: { issueId: issues[issueIdx]!.id, userId, minutes, note, billable: true },
    });
  await log(1, rex.id, 180, 'Tokens, sessions, cookies, regret.');
  await log(2, rex.id, 90, 'dnd-kit wrangling.');
  await log(0, boss.id, 120, 'Staring into the core.');
  await log(5, rex.id, 45, 'Mailpit + nodemailer.');
  await log(6, boss.id, 60, 'Trying to end the sprint. It refused.');

  // ── rates (money) ─────────────────────────────────────────────────────────
  await prisma.rate.create({ data: { scope: 'default', hourlyCents: 5000, currency: 'EUR' } });
  await prisma.rate.create({
    data: { scope: 'client', clientId: acme.id, hourlyCents: 8000, currency: 'EUR' },
  });
  await prisma.rate.create({
    data: { scope: 'issue', issueId: issues[0]!.id, hourlyCents: 12000, currency: 'EUR' },
  });

  console.log(
    `🌀 Seeded: 1 client, 3 users, project ${project.key} with ${issues.length} issues, 1 active sprint.`,
  );
  console.log('   Log in as boss@example.test (admin) — magic link will appear in Mailpit.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
