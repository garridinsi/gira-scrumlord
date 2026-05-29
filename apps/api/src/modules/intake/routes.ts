// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';
import { parseGrafana, parseWordpress, type NormalizedIntake } from '@gira/chaos';
import { generateToken, hashToken, safeEqualHash } from '@gira/domain';
import {
  createAssignmentRuleSchema,
  createIntakeSourceSchema,
  updateIntakeSourceSchema,
} from '@gira/shared';
import { recordAudit } from '@gira/sauron';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth, requireRole } from '../../lib/auth.js';
import { forbidden, notFound, unauthorized } from '../../lib/http-error.js';
import { intakeRateLimit } from '../../lib/rate-limits.js';
import { assertCanAccessProject, assertCanWrite } from '../../lib/scope.js';
import { toIntakeSourceView } from '../../lib/views.js';
import { getProjectByKeyOr404 } from '../projects/service.js';
import { runIntake } from './service.js';

const adminOnly = { preHandler: [requireAuth, requireRole('admin')] };

function parseGeneric(body: unknown): NormalizedIntake[] {
  const b = (body ?? {}) as Record<string, unknown>;
  return [
    {
      title: String(b.title ?? 'Issue').slice(0, 200),
      description: String(b.description ?? ''),
      externalRef: typeof b.externalRef === 'string' ? b.externalRef : undefined,
      labels: ['generic'],
    },
  ];
}

export async function intakeRoutes(app: FastifyInstance): Promise<void> {
  // ── intake sources (admin) ──────────────────────────────────────────────
  app.get('/intake-sources', adminOnly, async () => {
    const sources = await prisma.intakeSource.findMany({ orderBy: { createdAt: 'desc' } });
    return sources.map(toIntakeSourceView);
  });

  app.post('/intake-sources', adminOnly, async (req, reply) => {
    const user = currentUser(req);
    const input = createIntakeSourceSchema.parse(req.body);
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw notFound('project not found');

    const { raw, hash } = generateToken();
    const source = await prisma.intakeSource.create({
      data: {
        name: input.name,
        kind: input.kind,
        projectId: input.projectId,
        tokenHash: hash,
        defaultType: input.defaultType,
        defaultPriority: input.defaultPriority,
      },
    });
    await recordAudit(prisma, {
      actorId: user.id,
      action: 'intakeSource.create',
      entityType: 'IntakeSource',
      entityId: source.id,
      after: { name: source.name, kind: source.kind },
    });
    // The raw token is shown exactly once.
    return reply.code(201).send({
      ...toIntakeSourceView(source),
      token: raw,
      intakeUrl: `/intake/${source.id}`,
    });
  });

  app.patch('/intake-sources/:id', adminOnly, async (req) => {
    const { id } = req.params as { id: string };
    const input = updateIntakeSourceSchema.parse(req.body);
    const source = await prisma.intakeSource.update({ where: { id }, data: input });
    return toIntakeSourceView(source);
  });

  app.delete('/intake-sources/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.intakeSource.delete({ where: { id } });
    return reply.code(204).send();
  });

  // ── assignment rules ────────────────────────────────────────────────────
  app.get('/projects/:key/assignment-rules', { preHandler: requireAuth }, async (req) => {
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(currentUser(req), project);
    return prisma.assignmentRule.findMany({ where: { projectId: project.id }, orderBy: { order: 'asc' } });
  });

  app.post('/projects/:key/assignment-rules', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertCanWrite(user);
    const { key } = req.params as { key: string };
    const project = await getProjectByKeyOr404(key);
    assertCanAccessProject(user, project);
    const input = createAssignmentRuleSchema.parse(req.body);
    const rule = await prisma.assignmentRule.create({ data: { projectId: project.id, ...input } });
    return reply.code(201).send(rule);
  });

  app.delete('/assignment-rules/:id', { preHandler: requireAuth }, async (req, reply) => {
    assertCanWrite(currentUser(req));
    const { id } = req.params as { id: string };
    await prisma.assignmentRule.delete({ where: { id } });
    return reply.code(204).send();
  });

  // ── inbound webhook (no session; token-authenticated) ─────────────────────
  app.post('/intake/:sourceId', { config: { rateLimit: intakeRateLimit } }, async (req, reply) => {
    const { sourceId } = req.params as { sourceId: string };
    const header = req.headers['x-gira-token'];
    const provided =
      (typeof header === 'string' ? header : undefined) ??
      (req.query as { token?: string } | undefined)?.token;
    if (!provided) throw unauthorized('missing intake token');

    const source = await prisma.intakeSource.findUnique({ where: { id: sourceId } });
    // Constant-time check; don't reveal whether the source exists.
    if (!source || !safeEqualHash(hashToken(provided), source.tokenHash)) {
      throw unauthorized('invalid intake credentials');
    }
    if (!source.active) throw forbidden('intake source is disabled');

    const intakes =
      source.kind === 'grafana'
        ? parseGrafana(req.body)
        : source.kind === 'wordpress'
          ? [parseWordpress(req.body)]
          : parseGeneric(req.body);

    const results = await runIntake(source, intakes);
    return reply.code(202).send({ results });
  });
}
