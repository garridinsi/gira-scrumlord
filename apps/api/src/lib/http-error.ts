// SPDX-License-Identifier: GPL-3.0-or-later
// Typed HTTP errors. Throw these from anywhere; the error handler maps them.

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'authentication required') => new HttpError(401, msg);
export const forbidden = (msg = 'forbidden') => new HttpError(403, msg);
export const notFound = (msg = 'not found') => new HttpError(404, msg);
export const conflict = (msg: string, details?: unknown) => new HttpError(409, msg, details);
