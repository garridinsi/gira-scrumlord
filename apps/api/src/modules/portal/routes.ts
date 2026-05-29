// SPDX-License-Identifier: GPL-3.0-or-later
import { prisma } from '@gira/db';
import { createRequestSchema } from '@gira/shared';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { forbidden, notFound } from '../../lib/http-error.js';
import { toIssueView } from '../../lib/views.js';
import { computePortalOverview } from './service.js';
import { createIssue } from '../issues/service.js';
import { getInvoice, listClientInvoices, toInvoiceView } from '../invoices/service.js';

function clientUser(req: Parameters<typeof currentUser>[0]) {
  const user = currentUser(req);
  if (user.kind !== 'client' || !user.clientId) {
    throw forbidden('the portal is for client users');
  }
  return { ...user, clientId: user.clientId };
}

export async function portalRoutes(app: FastifyInstance): Promise<void> {
  app.get('/portal', { preHandler: requireAuth }, async (req) => {
    const user = clientUser(req);
    return computePortalOverview(user.clientId);
  });

  // A client files a request — becomes a constrained issue in their own project.
  app.post('/portal/requests', { preHandler: requireAuth }, async (req, reply) => {
    const user = clientUser(req);
    const input = createRequestSchema.parse(req.body);

    const project = await prisma.project.findUnique({
      where: { key: input.projectKey },
      select: { clientId: true },
    });
    if (!project) throw notFound('project not found');
    if (project.clientId !== user.clientId) throw forbidden('not your project');

    const issue = await createIssue(
      {
        projectKey: input.projectKey,
        title: input.title,
        description: input.description,
        type: input.type,
        priority: 'medium', // clients never set priority (no self-triggered emergencies)
        billingMode: 'hourly',
      },
      user.id,
    );
    return reply.code(201).send(toIssueView(issue));
  });

  // A client sees only their own *issued/paid* annexes — drafts AND voided ones
  // stay staff-side (a cancelled annex must never appear to the client).
  const clientVisible = (status: string) => status === 'issued' || status === 'paid';

  app.get('/portal/invoices', { preHandler: requireAuth }, async (req) => {
    const user = clientUser(req);
    const invoices = await listClientInvoices(user.clientId);
    return invoices.filter((i) => clientVisible(i.status));
  });

  app.get('/portal/invoices/:id', { preHandler: requireAuth }, async (req) => {
    const user = clientUser(req);
    const { id } = req.params as { id: string };
    const invoice = await getInvoice(id);
    // 404 (not 403) on someone else's, a draft, or a voided annex — never confirm it exists.
    if (invoice.clientId !== user.clientId || !clientVisible(invoice.status)) {
      throw notFound('invoice not found');
    }
    return toInvoiceView(invoice);
  });
}
