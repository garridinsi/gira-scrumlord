# gira-scrumlord — M3 Design Spec (Notifications + Emergency Paging)

**Date:** 2026-05-23
**Builds on:** M1 (the `Outbox` table, `issue.emergency` events, `scrumlord`'s `outbox-dispatch` job).
**License:** GPL-3.0. Same hard rules: public repo, fictional data only, no fake stubs, honesty.

## Goal

When something notable happens — above all an **emergency** — notify the right people through configured channels, and **keep paging until someone acknowledges**. Built on the existing event seam, so it's additive.

## Concepts

- **NotificationChannel** — where notifications go. `kind` ∈ {`email`, `webhook`}, a `target` (email address or URL), a `scope` (`global` | `project`), an optional `projectId`, and an `events` list (which event types it wants, e.g. `['issue.emergency','issue.assigned']`). Admin/member-managed.
- **Notification** — a delivery record (audit + retry): `type`, `channelId`, `payload`, `status` (`pending`|`sent`|`failed`), `attempts`, `error?`, `sentAt?`.
- **Incident** — opened when an issue reaches `emergency`. `issueId`, `status` (`open`|`acked`|`resolved`), `escalationLevel`, `lastNotifiedAt`, `acknowledgedById?`, `acknowledgedAt?`. The pager nudges open incidents until acked.

## Flow

1. API writes domain events to `Outbox` (already does for `issue.emergency`; M3 also emits `issue.assigned`).
2. `scrumlord`'s **outbox-dispatch** job (every minute) drains unprocessed events → the **dispatcher**:
   - resolves matching channels (scope + event type; project-scoped channels match the event's project),
   - for `issue.emergency`, opens an `Incident` (deduped per issue while open),
   - delivers to each channel, recording a `Notification`.
3. `scrumlord`'s **escalation** job (every 2 min) finds `open` incidents whose `lastNotifiedAt` is older than the escalation interval, re-notifies (bumps `escalationLevel`), up to a max level.
4. Acking (`POST /incidents/:id/ack`) stops escalation; resolving closes it.

## Delivery

- **email**: reuse the existing nodemailer transport (Mailpit in dev, `jsonTransport` in test).
- **webhook**: `POST` JSON to `target`. **SSRF guard**: reject private/loopback/link-local hosts unless `ALLOW_PRIVATE_WEBHOOKS=true` (dev). Timeout + capture failures into `Notification.error`.
- Delivery is isolated behind a `deliver(channel, payload)` function so it's unit-testable without real network/SMTP.

## API (admin/member unless noted)

```
GET    /channels                 list (scoped)
POST   /channels                 create (kind,target,scope,projectId?,events)
PATCH  /channels/:id             update
DELETE /channels/:id
POST   /channels/:id/test        send a test notification now

GET    /incidents?status         list (scoped; clients see only their own project incidents, read-only)
POST   /incidents/:id/ack        acknowledge (stops escalation)
POST   /incidents/:id/resolve    close
```

## Tests

- Dispatcher resolves the right channels for an event (scope + event-type filtering) and records `Notification`s; delivery is stubbed.
- An `issue.emergency` event opens exactly one `Incident` (deduped while open).
- Escalation re-notifies an open incident past the interval and bumps level; an acked incident is skipped.
- Webhook SSRF guard rejects loopback/private targets by default.
- `POST /channels/:id/test` delivers a test payload.

## Out of scope (M3)
Per-user quiet hours, SMS/phone providers, rich templating, read receipts. Channels are admin-configured (no self-serve subscription UI — that's frontend, owned by Claude Design).
