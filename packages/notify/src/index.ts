// SPDX-License-Identifier: GPL-3.0-or-later
export { deliver, sendUserEmail, type Channel, type DeliverResult } from './deliver.js';
export { assertSafeWebhookUrl, assertResolvedHostSafe, isPrivateHost } from './ssrf.js';
export {
  dispatchEvent,
  dispatchOutboxBatch,
  deliverPersonal,
  resolveChannels,
  ensureIncident,
  type DomainEvent,
} from './dispatch.js';
export { escalateOpenIncidents } from './escalate.js';
export { notifyConfig } from './config.js';
