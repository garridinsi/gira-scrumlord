// SPDX-License-Identifier: GPL-3.0-or-later
// Staff billing surface. Clients never reach these — they read their own issued
// invoices through the portal. Generation/transitions require a writer role.

import { generateInvoiceSchema, setExternalRefSchema } from '@gira/shared';
import type { FastifyInstance } from 'fastify';
import { type AuthUser, currentUser, requireAuth } from '../../lib/auth.js';
import { forbidden } from '../../lib/http-error.js';
import { assertCanWrite } from '../../lib/scope.js';
import {
  deleteInvoice,
  generateInvoice,
  getInvoice,
  issueInvoice,
  listClientInvoices,
  payInvoice,
  setInvoiceExternalRef,
  toInvoiceView,
  voidInvoice,
} from './service.js';

function assertStaff(u: AuthUser): void {
  if (u.kind !== 'staff') throw forbidden('billing is staff-only');
}

export async function invoiceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/clients/:id/invoices', { preHandler: requireAuth }, async (req) => {
    assertStaff(currentUser(req));
    const { id } = req.params as { id: string };
    return listClientInvoices(id);
  });

  app.post('/clients/:id/invoices', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertStaff(user);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    const input = generateInvoiceSchema.parse(req.body ?? {});
    const invoice = await generateInvoice(id, input, user.id);
    return reply.code(201).send(invoice);
  });

  app.get('/invoices/:id', { preHandler: requireAuth }, async (req) => {
    assertStaff(currentUser(req));
    const { id } = req.params as { id: string };
    return toInvoiceView(await getInvoice(id));
  });

  app.post('/invoices/:id/issue', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertStaff(user);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    return issueInvoice(id, user.id);
  });

  app.post('/invoices/:id/pay', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertStaff(user);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    return payInvoice(id, user.id);
  });

  // Record the external TicketBAI fiscal-invoice number this annex supports.
  app.post('/invoices/:id/external-ref', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertStaff(user);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    const { externalInvoiceRef } = setExternalRefSchema.parse(req.body);
    return setInvoiceExternalRef(id, externalInvoiceRef, user.id);
  });

  app.post('/invoices/:id/void', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    assertStaff(user);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    return voidInvoice(id, user.id);
  });

  app.delete('/invoices/:id', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertStaff(user);
    assertCanWrite(user);
    const { id } = req.params as { id: string };
    await deleteInvoice(id, user.id);
    return reply.code(204).send();
  });
}
