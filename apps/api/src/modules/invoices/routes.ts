// SPDX-License-Identifier: GPL-3.0-or-later
// Staff billing surface. Clients never reach these — they read their own issued
// annexes through the portal. Generate/issue/pay/external-ref require a staff
// writer; destructive actions (void, delete) are admin-only — least privilege for
// undoing or removing a billing record.

import { generateInvoiceSchema, setExternalRefSchema } from '@gira/shared';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { assertAdmin, assertCanWrite, assertStaff } from '../../lib/scope.js';
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
    assertAdmin(user); // destructive — admin only
    const { id } = req.params as { id: string };
    return voidInvoice(id, user.id);
  });

  app.delete('/invoices/:id', { preHandler: requireAuth }, async (req, reply) => {
    const user = currentUser(req);
    assertAdmin(user); // destructive — admin only
    const { id } = req.params as { id: string };
    await deleteInvoice(id, user.id);
    return reply.code(204).send();
  });
}
