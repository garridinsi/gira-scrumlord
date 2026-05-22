# `chaos` — where the stuff that works by accident lives

**M4: inbound integrations.** Pure adapters that turn external events into a
normalized intake shape. No DB, no I/O — just parsing — so they're trivially
testable. Persistence (dedup, auto-assign, issue creation) lives in the
`apps/api` intake module, which calls these.

Shipped:

- `parseGrafana(payload)` → `NormalizedIntake[]` — multi-alert, severity → priority
  (`critical → emergency`), `fingerprint` as the dedup ref, `resolved` flag.
- `parseWordpress(payload)` → `NormalizedIntake` — tolerant form-field mapping.
- `grafanaSeverityToPriority(severity)`.

A Grafana `critical` alert posted to `POST /intake/:sourceId` becomes an
`emergency` issue, which opens an incident and pages via M3 — no extra wiring.

Future (same pattern): Slack, email-in, generic webhooks with HMAC verification.
See [`PLAN.md`](../../PLAN.md) and `docs/superpowers/specs/2026-05-23-m4-integrations.md`.
