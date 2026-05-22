// SPDX-License-Identifier: GPL-3.0-or-later
// Listing users for assignee pickers / mention lists. Staff see all active users;
// a client user only sees their own client's people (isolation holds here too).

import { type Prisma, prisma } from '@gira/db';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { toUserView } from '../../lib/views.js';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get('/users', { preHandler: requireAuth }, async (req) => {
    const user = currentUser(req);
    const where: Prisma.UserWhereInput = { isActive: true };
    if (user.kind === 'client') where.clientId = user.clientId;
    const users = await prisma.user.findMany({ where, orderBy: { name: 'asc' } });
    return users.map(toUserView);
  });
}
