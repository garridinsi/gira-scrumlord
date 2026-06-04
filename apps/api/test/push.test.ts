// SPDX-License-Identifier: GPL-3.0-or-later
// Web Push subscription endpoints (/push/config, /auth/me/push). Self-scoped, auth-required,
// inert when unconfigured. The test env sets VAPID keys so the channel is ON.
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';

const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: 'pub-key', auth: 'auth-secret' } });

describe('Web Push (/push/config, /auth/me/push)', () => {
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

  it('requires authentication', async () => {
    expect((await app.inject({ method: 'GET', url: '/push/config' })).statusCode).toBe(401);
    expect(
      (await app.inject({ method: 'POST', url: '/auth/me/push', payload: sub('https://p/x') }))
        .statusCode,
    ).toBe(401);
  });

  it('exposes the VAPID public key when enabled', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const cfg = (
      await app.inject({ method: 'GET', url: '/push/config', headers: { cookie } })
    ).json();
    expect(cfg.enabled).toBe(true);
    expect(typeof cfg.publicKey).toBe('string');
    expect(cfg.publicKey.length).toBeGreaterThan(20);
  });

  it('subscribes, upserts on the same endpoint, and unsubscribes — self-scoped', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });

    // Subscribe.
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/auth/me/push',
          headers: { cookie },
          payload: sub('https://fcm.googleapis.com/fcm/send/ep1'),
        })
      ).statusCode,
    ).toBe(204);
    expect(await prisma.pushSubscription.count({ where: { userId: user.id } })).toBe(1);

    // Re-subscribe same endpoint → upsert, not a duplicate.
    await app.inject({
      method: 'POST',
      url: '/auth/me/push',
      headers: { cookie },
      payload: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/ep1',
        keys: { p256dh: 'p2', auth: 'a2' },
      },
    });
    const rows = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.p256dh).toBe('p2'); // keys refreshed

    // A second endpoint → a second row.
    await app.inject({
      method: 'POST',
      url: '/auth/me/push',
      headers: { cookie },
      payload: sub('https://web.push.apple.com/ep2'),
    });
    expect(await prisma.pushSubscription.count({ where: { userId: user.id } })).toBe(2);

    // Delete one by endpoint.
    await app.inject({
      method: 'DELETE',
      url: '/auth/me/push',
      headers: { cookie },
      payload: { endpoint: 'https://fcm.googleapis.com/fcm/send/ep1' },
    });
    expect(await prisma.pushSubscription.count({ where: { userId: user.id } })).toBe(1);

    // Delete all remaining (no endpoint given).
    expect(
      (await app.inject({ method: 'DELETE', url: '/auth/me/push', headers: { cookie } }))
        .statusCode,
    ).toBe(204);
    expect(await prisma.pushSubscription.count({ where: { userId: user.id } })).toBe(0);
  });

  it('rejects a malformed subscription (Zod 400)', async () => {
    const { cookie } = await actingAs({ role: 'member' });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/me/push',
      headers: { cookie },
      payload: { endpoint: 'not-a-url', keys: {} },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an untrusted/internal endpoint (SSRF guard) and never stores it', async () => {
    const { user, cookie } = await actingAs({ role: 'member' });
    for (const endpoint of [
      'http://169.254.169.254/latest/meta-data/', // cloud metadata
      'https://evil.example.com/hook', // arbitrary host
      'http://fcm.googleapis.com/fcm/send/x', // allowlisted host but plain http
      'https://fcm.googleapis.com.evil.com/x', // suffix-spoof
    ]) {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/me/push',
        headers: { cookie },
        payload: { endpoint, keys: { p256dh: 'p', auth: 'a' } },
      });
      expect(res.statusCode).toBe(400);
    }
    expect(await prisma.pushSubscription.count({ where: { userId: user.id } })).toBe(0);
  });

  it('never deletes another user’s subscription', async () => {
    const a = await actingAs({ role: 'member' });
    const b = await actingAs({ role: 'member' });
    await prisma.pushSubscription.create({
      data: {
        userId: a.user.id,
        endpoint: 'https://push.example/owned-by-a',
        p256dh: 'x',
        auth: 'y',
      },
    });
    // B tries to delete A's endpoint — scoped to B, so it's a no-op.
    await app.inject({
      method: 'DELETE',
      url: '/auth/me/push',
      headers: { cookie: b.cookie },
      payload: { endpoint: 'https://push.example/owned-by-a' },
    });
    expect(await prisma.pushSubscription.count({ where: { userId: a.user.id } })).toBe(1);
  });
});
