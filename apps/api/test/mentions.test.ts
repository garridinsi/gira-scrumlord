// SPDX-License-Identifier: GPL-3.0-or-later
// @mention fan-out on comment creation. The parser is pure (packages/domain); these tests
// pin the AUTHORIZATION the route layer adds on top: who may actually be notified, and the
// hard rule that an internal note can never notify (or reveal) a client.
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs, makeUser } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

const mention = (name: string, id: string) => `@[${name}](${id})`;

describe('@mention notifications', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
  });

  const postComment = (cookie: string, body: string, visibility: 'client' | 'internal') =>
    app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/comments',
      headers: { cookie },
      payload: { body, visibility },
    });

  const mentionsOf = (userId: string) =>
    prisma.notification.findMany({ where: { userId, type: 'mention' } });

  async function setup(clientId?: string) {
    const { user, cookie } = await actingAs({ role: 'member', name: 'Author' });
    await seedProject({ reporterId: user.id, clientId: clientId ?? null });
    await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { cookie },
      payload: { projectKey: 'GIRA', title: 'Mentionable' },
    });
    return { author: user, cookie };
  }

  it('notifies a mentioned staff teammate, never the author, never an unmentioned user', async () => {
    const { cookie } = await setup();
    const bea = await makeUser({ name: 'Bea', role: 'member' });
    const cris = await makeUser({ name: 'Cris', role: 'member' }); // unmentioned

    const res = await postComment(cookie, `cc ${mention('Bea', bea.id)} please review`, 'internal');
    expect(res.statusCode).toBe(201);

    const beaN = await mentionsOf(bea.id);
    expect(beaN).toHaveLength(1);
    expect(beaN[0]!.payload).toMatchObject({
      issueKey: 'GIRA-1',
      projectKey: 'GIRA',
      actorName: 'Author',
    });
    expect(await mentionsOf(cris.id)).toHaveLength(0);
  });

  it('deduplicates: mentioning the same teammate twice yields a single notification', async () => {
    const { cookie } = await setup();
    const bea = await makeUser({ name: 'Bea', role: 'member' });
    await postComment(
      cookie,
      `${mention('Bea', bea.id)} and again ${mention('Bea', bea.id)}`,
      'internal',
    );
    expect(await mentionsOf(bea.id)).toHaveLength(1);
  });

  it('ignores a self-mention (the author never notifies themselves)', async () => {
    const { author, cookie } = await setup();
    await postComment(cookie, `note to self ${mention('Author', author.id)}`, 'internal');
    expect(await mentionsOf(author.id)).toHaveLength(0);
  });

  it('an internal note never notifies a client; a client-visible comment does', async () => {
    const client = await prisma.client.create({
      data: { name: 'Acme', slug: 'acme-mention', currency: 'EUR' },
    });
    const { cookie } = await setup(client.id);
    const carla = await makeUser({
      name: 'Carla',
      kind: 'client',
      role: 'viewer',
      clientId: client.id,
    });

    // INTERNAL note mentioning the client → suppressed (never leaks the staff-only note).
    await postComment(cookie, `internal: ${mention('Carla', carla.id)}`, 'internal');
    expect(await mentionsOf(carla.id)).toHaveLength(0);

    // CLIENT-visible comment mentioning the same client user → delivered.
    await postComment(cookie, `hi ${mention('Carla', carla.id)}`, 'client');
    expect(await mentionsOf(carla.id)).toHaveLength(1);
  });

  it('never notifies a foreign-tenant client, an inactive user, or a bogus id', async () => {
    const client = await prisma.client.create({
      data: { name: 'Acme', slug: 'acme-m2', currency: 'EUR' },
    });
    const other = await prisma.client.create({
      data: { name: 'Other', slug: 'other-m2', currency: 'EUR' },
    });
    const { cookie } = await setup(client.id);
    const foreign = await makeUser({
      name: 'Foreign',
      kind: 'client',
      role: 'viewer',
      clientId: other.id,
    });
    const inactive = await makeUser({ name: 'Ghost', role: 'member' });
    await prisma.user.update({ where: { id: inactive.id }, data: { isActive: false } });
    const bogus = 'claaaaaaaaaaaaaaaaaaaaaaaa';

    await postComment(
      cookie,
      `${mention('Foreign', foreign.id)} ${mention('Ghost', inactive.id)} ${mention('Nobody', bogus)}`,
      'client',
    );
    expect(await mentionsOf(foreign.id)).toHaveLength(0);
    expect(await mentionsOf(inactive.id)).toHaveLength(0);
    expect(await prisma.notification.findMany({ where: { type: 'mention' } })).toHaveLength(0);
  });

  // ── the picker data source: GET /issues/:key/mentionable ──────────────────────
  const namesOf = (res: { json: () => { name: string }[] }) => res.json().map((u) => u.name);

  it('mentionable (staff): active staff + project client users, excluding self and inactive', async () => {
    const client = await prisma.client.create({
      data: { name: 'Acme', slug: 'acme-pick', currency: 'EUR' },
    });
    const { cookie } = await setup(client.id);
    await makeUser({ name: 'Bea', role: 'member' });
    const inactive = await makeUser({ name: 'Zzz Inactive', role: 'member' });
    await prisma.user.update({ where: { id: inactive.id }, data: { isActive: false } });
    await makeUser({ name: 'Carla', kind: 'client', role: 'viewer', clientId: client.id });

    const res = await app.inject({
      method: 'GET',
      url: '/issues/GIRA-1/mentionable',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const names = namesOf(res);
    expect(names).toContain('Bea');
    expect(names).toContain('Carla'); // project's client user
    expect(names).not.toContain('Author'); // caller excludes self
    expect(names).not.toContain('Zzz Inactive'); // inactive excluded
    // client-safe projection only — no email/role leak
    expect(res.json()[0]).toEqual({ id: expect.any(String), name: expect.any(String) });
  });

  it('mentionable (client): only issue-visible staff + own-tenant users, never the full directory', async () => {
    const client = await prisma.client.create({
      data: { name: 'Acme', slug: 'acme-pick2', currency: 'EUR' },
    });
    const other = await prisma.client.create({
      data: { name: 'Other', slug: 'other-pick2', currency: 'EUR' },
    });
    const author = await actingAs({ role: 'member', name: 'Author' }); // reporter of GIRA-1
    const dev = await makeUser({ name: 'Dev', role: 'member' }); // assignee
    await makeUser({ name: 'Zara', role: 'member' }); // unrelated staff — must stay hidden
    await seedProject({ reporterId: author.user.id, clientId: client.id });
    await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { cookie: author.cookie },
      payload: { projectKey: 'GIRA', title: 'X', assigneeId: dev.id },
    });

    const carla = await actingAs({
      name: 'Carla',
      kind: 'client',
      role: 'viewer',
      clientId: client.id,
    });
    await makeUser({ name: 'Dan', kind: 'client', role: 'viewer', clientId: client.id });
    await makeUser({ name: 'Foreign', kind: 'client', role: 'viewer', clientId: other.id });

    const res = await app.inject({
      method: 'GET',
      url: '/issues/GIRA-1/mentionable',
      headers: { cookie: carla.cookie },
    });
    expect(res.statusCode).toBe(200);
    const names = namesOf(res);
    expect(names).toContain('Author'); // reporter — already visible to the client
    expect(names).toContain('Dev'); // assignee — already visible
    expect(names).toContain('Dan'); // own-tenant client user
    expect(names).not.toContain('Zara'); // unrelated staff never exposed
    expect(names).not.toContain('Foreign'); // foreign tenant never exposed
    expect(names).not.toContain('Carla'); // self excluded
  });
});
