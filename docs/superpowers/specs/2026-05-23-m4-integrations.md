# gira-scrumlord — M4 Design Spec (Inbound Integrations + Auto-assign)

**Date:** 2026-05-23
**Builds on:** M1 (issues/createIssue, labels), M3 (emergency → Outbox → paging).
**License:** GPL-3.0. Same hard rules.

## Goal

Auto-create (and auto-resolve) issues from external systems — **Grafana** alerts and **WordPress** forms — and auto-assign new work by rules. A Grafana `critical` alert becomes an `emergency` issue, which flows straight into M3 paging with no extra wiring.

## Layering

- **`packages/chaos`** — *pure* adapters: parse an external payload into a `NormalizedIntake` (no DB). Fully unit-tested. ("Where the stuff that works by accident lives.")
- **`apps/api` intake module** — HTTP routes, per-source **token auth** (external callers have no session cookie), dedup, auto-assignment, persistence (reuses `createIssue`), and emits the same Outbox events M3 consumes.

## Data model (migration)

- **IntakeSource**: `name`, `kind` (`grafana`|`wordpress`|`generic`), `projectId` (target), `tokenHash` (sha256; raw token shown once on create), `defaultType`, `defaultPriority`, `active`.
- **AssignmentRule**: `projectId`, `order`, optional `matchType`/`matchPriority`/`matchLabelId` (null = wildcard), `assigneeId`. First match by order wins.
- **Issue** gains `externalRef?` + `intakeSourceId?` with a unique `(intakeSourceId, externalRef)` for **dedup** (one issue per external alert fingerprint).

## NormalizedIntake (chaos output)

```ts
interface NormalizedIntake {
  externalRef?: string;   // alert fingerprint / form id — for dedup
  title: string;
  description: string;
  type?: IssueType;
  priority?: Priority;
  labels?: string[];      // label names to ensure + attach
  resolved?: boolean;     // grafana "resolved" → close the matching issue
}
```

- **Grafana**: one intake per `alerts[]` entry. `title` ← `annotations.summary || labels.alertname`; `priority` ← severity map (`critical→emergency`, `error/high→urgent`, `warning→high`, `info→medium`, else `high`); `externalRef` ← `fingerprint`; `resolved` ← `status==='resolved'`; labels include `grafana` + `alertname`.
- **WordPress**: a generic form `{ subject|title, message|description, name?, email? }` → a `task`, `priority` medium, description includes sender.

## API

```
# admin-managed config
GET|POST /intake-sources        POST returns { ...source, token } ONCE
PATCH|DELETE /intake-sources/:id
GET|POST /projects/:key/assignment-rules ; DELETE /assignment-rules/:id

# external callers (no cookie; header `X-Gira-Token: <token>`)
POST /intake/:sourceId          parse per source.kind -> intake
```

## Intake flow (apps/api)

1. Auth: load source by id, constant-time compare `hashToken(header)` to `tokenHash`; reject `401` otherwise; `403` if inactive.
2. Parse payload via `@gira/chaos` for `source.kind` → `NormalizedIntake[]`.
3. For each: ensure labels exist; resolve assignee via `AssignmentRule`; **dedup** on `(sourceId, externalRef)`:
   - exists + `resolved` → move issue to a done status (close it);
   - exists + not resolved → skip (idempotent);
   - absent + not resolved → `createIssue(...)` (as a system bot user), then set `externalRef`/`intakeSourceId`.
4. `createIssue` already emits `issue.emergency` to the Outbox when priority is emergency → M3 pages. 

## Tests
- chaos: grafana severity map + multi-alert parse + resolved flag; wordpress parse. (pure)
- api: bad/inactive token → 401/403; grafana firing-critical creates an `emergency` issue + Outbox event; same fingerprint again → no duplicate; grafana resolved closes it; wordpress creates a task; an assignment rule auto-assigns a new intake issue.

## Out of scope (M4)
Slack/Jira/email-in adapters (same pattern, later), retry/backoff on intake, signature verification beyond the shared token (HMAC is a fast follow).
