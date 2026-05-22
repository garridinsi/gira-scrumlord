# gira-scrumlord — M1 Design Spec (Core tracker + time + money)

**Date:** 2026-05-22
**Status:** Approved (YOLO mandate — agent owns delivery)
**License:** GPL-3.0 (do not change)

## 0. Hard constraints (read first)

- **Public, open-source, "for the laughs."** This repo is deliberately **decoupled** from the author's `alferro` ecosystem. Do not wire it into Keycloak/alferro-api/alferro-infra, do not mirror their stack "for fit."
- **Never leak client info.** No real client names, secrets, internal hostnames, or private references in code, docs, commits, or seed data. **All demo/seed data is fictional** (Acme Corp, Wile E. Coyote, etc.).
- **Honesty over theatre.** No placeholder UI that pretends to work. If a thing isn't built, it's labelled or absent. Lore easter eggs (`scrumlord`, `sauron`, port 666) must be *real working code*.
- **Security basics are non-negotiable.** Single-use hashed magic-link tokens, httpOnly secure session cookies, parameterized queries (Prisma), input validation (Zod) at every boundary, Helmet headers, strict row-level data isolation for client users.

## 1. Goal

A lightweight, genuinely usable, self-hostable Jira alternative whose first milestone delivers the **core issue tracker with time tracking and money/billing baked into the data model from day one** — so later milestones (client portal, paging, integrations, invoicing) add behaviour, not migrations.

## 2. Stack & rationale

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere | One language front+back, shared types |
| Backend | Node 20 + **Fastify** | Fast, schema-first, great DX |
| ORM/DB | **Prisma** + **PostgreSQL 16** | Type-safe, migrations, parameterized |
| Validation | **Zod** (shared) | Same schemas validate API in + type the client |
| Jobs | **pg-boss** (Postgres-backed) | No Redis → only datastore is Postgres → 1-command self-host |
| Frontend | **React + Vite + Tailwind + @dnd-kit** | Board drag-drop, dark-only theme |
| Data fetching | **TanStack Query** + React Router | Cache + routing |
| Auth | Magic-link (passwordless) + server sessions, **OIDC-ready** | Asked-for; pluggable IdP later |
| Email | **nodemailer** → Mailpit (dev) | Catch magic links locally |
| Tests | **Vitest** + Supertest-style inject | Domain + API integration |
| Monorepo | **pnpm workspaces** | Shared packages |

**Recommendation flipped from Spring Boot to Node/TS** once the "match alferro infra" constraint was removed: for a public, vibe-coded, clone-and-run project, the lighter single-language stack wins.

## 3. Repo shape (lore as real modules)

```
gira-scrumlord/
├── apps/
│   ├── web/         # React app
│   ├── api/         # Fastify REST API — README's "core"
│   └── scrumlord/   # pg-boss worker — the daemon that governs the dailies
├── packages/
│   ├── db/          # Prisma schema, migrations, seed (fictional)
│   ├── domain/      # pure logic: issue keys, rate resolution, velocity, rank
│   ├── sauron/      # append-only audit log + read-only port-666 service
│   ├── chaos/       # integration adapters (later milestones; "works by accident")
│   └── shared/      # Zod schemas + TS types shared by web & api
├── docker-compose.yml
├── PLAN.md
└── docs/superpowers/{specs,plans}/
```

The README's literal `src/core|scrumlord|sauron|chaos` tree was self-described as "a small, kind lie"; these workspace packages make those names true.

## 4. Domain model (M1)

Entities and the key relationships:

- **Client** — a customer organisation. `id, name, slug, currency (ISO 4217), notes`. Has many Projects, Users, Rates.
- **User** — `id, email (unique), name, kind (staff|client), role (admin|member|viewer), clientId? (required when kind=client), isActive`. No password column (passwordless).
- **Identity** — OIDC-ready auth binding: `id, userId, provider (magic-link|oidc:<issuer>), subject, email`. Unique `(provider, subject)`.
- **Session** — `id, userId, tokenHash, userAgent, expiresAt, revokedAt`. Cookie carries opaque id+secret; only the hash is stored.
- **MagicLinkToken** — `id, email, tokenHash, expiresAt, consumedAt`. Single-use, short TTL.
- **Project** — `id, key (e.g. GIRA, unique), name, description, clientId? (null = internal), issueCounter`. Owns Statuses, Labels, Sprints, Issues.
- **Status** — per-project workflow column: `id, projectId, name, category (todo|in_progress|done), order`. Seeded Backlog/To Do/In Progress/In Review/Done.
- **Label** — `id, projectId, name, color`. M:N with Issue.
- **Sprint** — `id, projectId, name, goal, startDate?, endDate?, state (future|active|closed), committedPoints?`.
- **Issue** — `id, projectId, key (PROJ-N), title, description (Markdown), type (task|bug|story|epic), priority (low|medium|high|urgent|emergency), statusId, assigneeId?, reporterId, sprintId?, parentId?, storyPoints?, estimateMinutes?, rank (string, fractional), billingMode (hourly|fixed), fixedPriceCents?, createdAt, updatedAt, closedAt?`.
- **Comment** — `id, issueId, authorId, body (Markdown), createdAt`.
- **Worklog** — `id, issueId, userId, minutes, note, billable (bool), startedAt?, loggedAt`.
- **Timer** — running stopwatch: `id, issueId, userId, startedAt`. Unique active timer per `(userId)`. Stop → writes a Worklog.
- **Rate** — resolution chain row: `id, scope (default|client|project|issue), clientId?|projectId?|issueId?, hourlyCents, currency`. Exactly one target set per scope.
- **AuditLog** — append-only: `id, actorId?, action, entityType, entityId, before (jsonb?), after (jsonb?), at`.
- **Outbox** — domain events for scrumlord/notifications: `id, type, payload (jsonb), createdAt, processedAt?`. (Seam for M3 paging.)

### Money rules

- All money is **integer minor units (cents)** + an ISO currency code. Never floats.
- **Rate resolution order:** issue → project → client → default. First match wins.
- **Accrued cost (derived):** if `billingMode=fixed` → `fixedPriceCents`. Else `round(Σ billable worklog minutes / 60 × resolvedHourlyCents)`.
- Trade-off accepted for M1: cost is resolve-on-read, so changing a rate retroactively changes historical cost. M5 (billing) snapshots the rate per worklog. Seam noted, not built.

### Issue keys & rank

- Key = `project.key + "-" + nextCounter` generated atomically (`UPDATE ... RETURNING` on `Project.issueCounter` inside the create transaction).
- `rank` is a lexicographically-sortable fractional string (LexoRank-style midpoint between neighbours) so drag-drop reordering is an O(1) single-row update.

## 5. API surface (M1)

REST, JSON, cookie session. All inputs Zod-validated. All mutations write an AuditLog row.

```
POST   /auth/magic-link            { email }            -> 202 (always; no user enumeration)
POST   /auth/callback              { token }            -> sets session cookie, 200 { user }
POST   /auth/logout                                     -> 204
GET    /auth/me                                         -> { user }

GET    /clients                    (staff)              CRUD: POST/GET/PATCH/DELETE /clients/:id
GET    /projects                   POST /projects       GET/PATCH/DELETE /projects/:key
GET    /projects/:key/statuses     POST/PATCH/DELETE
GET    /projects/:key/labels       POST/PATCH/DELETE
GET    /projects/:key/board                              -> columns[] with issues by status, ordered by rank
GET    /projects/:key/backlog                            -> issues with no active sprint
GET    /projects/:key/sprints      POST; PATCH/DELETE /sprints/:id; POST /sprints/:id/{start,close}
GET    /issues?projectKey&status&assignee&type&priority&label&sprint&q   -> search/filter
POST   /issues                     GET/PATCH/DELETE /issues/:key
POST   /issues/:key/move           { statusId?, rank?, sprintId? }       -> board moves
GET    /issues/:key/comments       POST /issues/:key/comments
GET    /issues/:key/worklogs       POST /issues/:key/worklogs
POST   /timers/start               { issueKey }         -> Timer
POST   /timers/stop                                     -> Worklog
GET    /timers/active                                   -> Timer | null
GET    /rates                      POST/PATCH/DELETE     (scoped)
GET    /issues/:key/cost                                 -> { minutes, billableMinutes, currency, accruedCents, mode }
GET    /projects/:key/summary                            -> time + money + velocity rollups

# served by packages/sauron on PORT 666:
GET    /health                                          -> { status, db, version }
GET    /audit?entityType&entityId&actor&limit           -> read-only audit trail
```

## 6. AuthZ / isolation

- Roles: `admin` (everything), `member` (staff, full project work), `viewer`/`client` (read + comment + their own worklogs, scoped to their `clientId`).
- A request scope middleware computes the set of project ids the user may touch. Client users: only projects whose `clientId` matches theirs. Every list query is filtered server-side; every by-id fetch re-checks scope. No client can read another client's data — this is enforced in the data layer, not the UI.

## 7. The lore, real

- **scrumlord** (`apps/scrumlord`): pg-boss worker. Jobs: `sprint.autoclose` (close sprints past endDate, snapshot velocity), `timer.reap` (auto-stop timers running >12h, write capped worklog + flag), `outbox.dispatch` (drain Outbox; in M1 just logs/audits — the seam M3 paging consumes), `velocity.snapshot`.
- **sauron** (`packages/sauron`): every mutation records an immutable AuditLog row; a tiny read-only Fastify instance serves `/audit` + `/health` on **port 666**. "It only watches."
- **Velocity:** real committed-vs-completed points per sprint. A 🌀 flourish in the UI, never fabricated numbers. Boards over 5 cards in "In Progress" show a (real, dismissible) WIP-limit warning — honoring the README joke without breaking anything.

## 8. Testing

- `packages/domain`: pure unit tests — rate resolution order, accrued-cost math (incl. rounding & fixed mode), issue-key sequence, LexoRank midpoint/rebalance, velocity calc.
- `apps/api`: integration tests via `fastify.inject()` against a throwaway Postgres (Testcontainers if available, else a disposable compose DB / `DATABASE_URL` to a test schema), covering auth flow, isolation (client A cannot read client B), board moves, worklogs/timers, cost endpoints.
- CI-friendly: `pnpm test` runs domain + api. README's "no tests" gag stays in the *Reality* column; *Status* column updated honestly.

## 9. Out of scope for M1 (seams left, not built)

Client portal UI (M2), notifications + **emergency paging** (M3 — `emergency` priority + Outbox are the seam), inbound integrations Grafana/WordPress + auto-assign (M4, `packages/chaos`), invoices/exports/rate-snapshotting (M5).
