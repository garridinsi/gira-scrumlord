// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const pngB64 = PNG.toString('base64');

describe('attachments (N2)', () => {
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

  async function setup() {
    const { user, cookie } = await actingAs({ role: 'member' });
    const { projectKey } = await seedProject({ reporterId: user.id });
    await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { cookie },
      payload: { projectKey, title: 'Has files' },
    });
    return { user, cookie };
  }
  const upload = (cookie: string, filename: string, dataBase64: string) =>
    app.inject({
      method: 'POST',
      url: '/issues/GIRA-1/attachments',
      headers: { cookie },
      payload: { filename, dataBase64 },
    });

  it('uploads a sniff-validated file, lists metadata, and downloads it with safe headers', async () => {
    const { cookie } = await setup();

    const up = await upload(cookie, 'shot.png', pngB64);
    expect(up.statusCode).toBe(201);
    expect(up.json()).toMatchObject({
      filename: 'shot.png',
      contentType: 'image/png',
      sizeBytes: PNG.length,
    });
    const id = up.json().id as string;

    // List returns metadata only — never the bytes.
    const list = await app.inject({
      method: 'GET',
      url: '/issues/GIRA-1/attachments',
      headers: { cookie },
    });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0]).not.toHaveProperty('data');

    // Download is forced (attachment + nosniff) and returns the exact bytes.
    const dl = await app.inject({ method: 'GET', url: `/attachments/${id}`, headers: { cookie } });
    expect(dl.statusCode).toBe(200);
    expect(dl.headers['content-type']).toBe('image/png');
    expect(dl.headers['content-disposition']).toMatch(/attachment; filename="shot.png"/);
    expect(dl.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.from(dl.rawPayload).equals(PNG)).toBe(true);
  });

  it('stores the SNIFFED type, ignoring a lying client content-type/extension', async () => {
    const { cookie } = await setup();
    // A PNG uploaded as "evil.svg" is still stored as image/png (can never be served as SVG).
    const up = await upload(cookie, 'evil.svg', pngB64);
    expect(up.statusCode).toBe(201);
    expect(up.json().contentType).toBe('image/png');
  });

  it('rejects an empty file and an unsupported type', async () => {
    const { cookie } = await setup();
    expect((await upload(cookie, 'empty.png', '')).statusCode).toBe(400);
    // Unknown binary (NUL/control bytes) → not in the allowlist → 400.
    const junk = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x00]).toString('base64');
    const res = await upload(cookie, 'x.bin', junk);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/unsupported file type/i);
  });

  it("forbids a different tenant's client from downloading", async () => {
    const { cookie } = await setup();
    const id = (await upload(cookie, 'shot.png', pngB64)).json().id as string;
    const other = await prisma.client.create({
      data: { name: 'Other', slug: 'other-att', currency: 'EUR' },
    });
    const clientUser = await actingAs({ kind: 'client', role: 'viewer', clientId: other.id });
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/attachments/${id}`,
          headers: { cookie: clientUser.cookie },
        })
      ).statusCode,
    ).toBe(403);
  });

  it('deletes an attachment (and 404s a missing one)', async () => {
    const { cookie } = await setup();
    const id = (await upload(cookie, 'shot.png', pngB64)).json().id as string;
    expect(
      (await app.inject({ method: 'DELETE', url: `/attachments/${id}`, headers: { cookie } }))
        .statusCode,
    ).toBe(204);
    expect(
      (await app.inject({ method: 'GET', url: `/attachments/${id}`, headers: { cookie } }))
        .statusCode,
    ).toBe(404);
    expect(
      (await app.inject({ method: 'DELETE', url: '/attachments/nope', headers: { cookie } }))
        .statusCode,
    ).toBe(404);
  });
});
