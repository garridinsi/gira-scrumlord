// SPDX-License-Identifier: GPL-3.0-or-later
// Direct tests of deliver()/sendUserEmail branches the dispatch-level tests don't reach:
// manual redirect following + re-validation, redirect-without-location, non-2xx, the hop
// cap, the connection-error catch, email subject shaping, the unknown-channel guard, and
// the transport-failure path. nodemailer is mocked at the file level (one module instance,
// so branch data unions cleanly); webhooks hit a small routing HTTP server over loopback,
// with allowPrivate passed explicitly so the target is permitted regardless of ambient env.
import { createServer, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMailMock = vi.hoisted(() => vi.fn());
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: sendMailMock }) },
}));

import { deliver, sendUserEmail } from '../src/deliver.js';

beforeEach(() => sendMailMock.mockReset().mockResolvedValue({ messageId: 'x' }));

describe('deliver() webhook branches', () => {
  let server: Server;
  let base = '';
  let handler: (url: string, res: ServerResponse) => void = (_u, res) =>
    res.writeHead(200).end('ok');

  beforeEach(async () => {
    server = createServer((req, res) => {
      req.on('data', () => {});
      req.on('end', () => handler(req.url ?? '/', res));
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });

  const hook = (path = '/hook') => ({ kind: 'webhook' as const, target: `${base}${path}` });

  it('follows a manual redirect to a final 2xx and reports ok', async () => {
    handler = (url, res) => {
      if (url === '/hook') return res.writeHead(302, { location: '/final' }).end();
      return res.writeHead(200).end('done');
    };
    expect(await deliver(hook(), { type: 'x' }, { allowPrivate: true })).toEqual({ ok: true });
  });

  it('also re-validates webhooks when allowPrivate falls back to the configured default', async () => {
    // No opts.allowPrivate → uses notifyConfig.allowPrivateWebhooks (true under test env).
    handler = (_u, res) => res.writeHead(200).end('ok');
    expect(await deliver(hook(), { type: 'x' })).toEqual({ ok: true });
  });

  it('fails a redirect that carries no Location header', async () => {
    handler = (_u, res) => res.writeHead(302).end();
    const r = await deliver(hook(), { type: 'x' }, { allowPrivate: true });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/redirect with no location/);
  });

  it('reports a non-2xx response as an error', async () => {
    handler = (_u, res) => res.writeHead(500).end('boom');
    expect(await deliver(hook(), { type: 'x' }, { allowPrivate: true })).toEqual({
      ok: false,
      error: 'webhook responded 500',
    });
  });

  it('gives up after exceeding the redirect hop limit', async () => {
    handler = (_u, res) => res.writeHead(302, { location: '/again' }).end();
    expect(await deliver(hook(), { type: 'x' }, { allowPrivate: true })).toEqual({
      ok: false,
      error: 'webhook exceeded redirect limit',
    });
  });

  it('catches a transport/connection error (server closed → connection refused)', async () => {
    const target = `${base}/hook`;
    await new Promise<void>((r) => server.close(() => r()));
    const r = await deliver({ kind: 'webhook', target }, { type: 'x' }, { allowPrivate: true });
    expect(r.ok).toBe(false);
    server = createServer().listen(0, '127.0.0.1'); // placeholder so afterEach close() is safe
  });
});

describe('deliver() email + sendUserEmail branches', () => {
  const email = { kind: 'email' as const, target: 'oncall@example.test' };

  it('shapes the subject for emergency/normal and falls back to default title/type', async () => {
    expect(await deliver(email, { type: 'issue.emergency', title: 'DOWN' })).toEqual({ ok: true });
    expect(await deliver(email, { type: 'issue.assigned' })).toEqual({ ok: true });
    expect(await deliver(email, { type: 'issue.emergency' })).toEqual({ ok: true }); // no title
    expect(await deliver(email, {})).toEqual({ ok: true }); // no type → not emergency
    const subjects = sendMailMock.mock.calls.map((c) => c[0].subject as string);
    expect(subjects[0]).toMatch(/EMERGENCY: DOWN/);
    expect(subjects[1]).toMatch(/issue\.assigned/);
    expect(subjects[2]).toMatch(/EMERGENCY: incident/); // default title
    expect(subjects[3]).toMatch(/notification/); // default type
  });

  it('returns the error when the transport throws — both Error and non-Error, both entry points', async () => {
    // sendUserEmail: Error → e.message
    sendMailMock.mockImplementationOnce(() => {
      throw new Error('SMTP 550');
    });
    expect(await sendUserEmail('a@b.test', 's', 't')).toEqual({ ok: false, error: 'SMTP 550' });

    // sendUserEmail: non-Error → String(e)
    sendMailMock.mockImplementationOnce(() => {
      throw 'string failure';
    });
    expect(await sendUserEmail('a@b.test', 's', 't')).toEqual({
      ok: false,
      error: 'string failure',
    });

    // deliver() outer catch: non-Error → String(e) (the Error arm is covered by the webhook
    // connection-refused test above).
    sendMailMock.mockImplementationOnce(() => {
      throw 'deliver string failure';
    });
    expect(await deliver(email, { type: 'x' }, {})).toEqual({
      ok: false,
      error: 'deliver string failure',
    });
  });

  it('sendUserEmail succeeds through the transport', async () => {
    expect(await sendUserEmail('a@b.test', 'hi', 'body')).toEqual({ ok: true });
  });

  it('rejects an unknown channel kind', async () => {
    expect(await deliver({ kind: 'sms' as never, target: 'x' }, {})).toEqual({
      ok: false,
      error: 'unknown channel kind: sms',
    });
  });
});
