// SPDX-License-Identifier: GPL-3.0-or-later
// N2: issue attachments. Uploaded as base64 in JSON (kept small so it fits under the API
// body limit); the server sniffs the real type and stores the bytes in Postgres.
import { z } from 'zod';

/** 1 MiB cap on the decoded file — base64 of this (~1.37 MiB) stays under the 2 MiB body limit. */
export const MAX_ATTACHMENT_BYTES = 1_048_576;

export const createAttachmentSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  dataBase64: z.string().min(1),
});
export type CreateAttachment = z.infer<typeof createAttachmentSchema>;

/** Metadata only — the bytes are fetched via the authorized download endpoint, never listed. */
export interface AttachmentView {
  id: string;
  issueId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedById: string | null;
  createdAt: string;
}
