// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';

export async function resetDb(): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '\\_prisma%'`;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/** Minimal project+issue so notification logic has something to reference. */
export async function makeIssue(key = 'T-1', projectKey = 'T') {
  const user = await prisma.user.create({
    data: { email: `r-${key}-${Math.random().toString(36).slice(2)}@example.test`, name: 'Reporter' },
  });
  const project = await prisma.project.create({ data: { key: projectKey, name: projectKey } });
  const status = await prisma.status.create({
    data: { projectId: project.id, name: 'Backlog', category: 'todo', order: 0 },
  });
  const issue = await prisma.issue.create({
    data: {
      projectId: project.id,
      key,
      title: 'PROD DOWN',
      statusId: status.id,
      reporterId: user.id,
      priority: 'emergency',
      rank: 'a0',
    },
  });
  return { user, project, status, issue };
}

export { prisma };
