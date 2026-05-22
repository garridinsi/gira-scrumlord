# PLAN.md — `gira-scrumlord`

> The roadmap isn't read, it's felt. But we wrote it down anyway, because the velociraptor insisted.

This is the living engineering plan. Full design lives in
[`docs/superpowers/specs/2026-05-22-gira-scrumlord-m1-design.md`](docs/superpowers/specs/2026-05-22-gira-scrumlord-m1-design.md);
the task-by-task build plan in
[`docs/superpowers/plans/2026-05-22-m1-core-tracker.md`](docs/superpowers/plans/2026-05-22-m1-core-tracker.md).

## What this is

A lightweight, self-hostable Jira alternative. Public, GPL-3.0, for the laughs — but the
code is real and tested. First milestone: **core issue tracker with time tracking and
money/billing baked in from day one.**

## Architecture (one breath)

TypeScript monorepo (pnpm). A **Fastify** REST API (`apps/api`, the README's *core*) over
**Postgres** via **Prisma**. A **pg-boss** background worker (`apps/scrumlord`, the daemon).
A read-only audit log (`packages/sauron`) that serves `/audit` + `/health` on **port 666**.
A **React + Vite + Tailwind** frontend (`apps/web`) with a drag-drop Kanban board. Auth is
passwordless **magic-link** with server-side sessions, designed OIDC-ready so a client's IdP
can plug in later. The only datastore is Postgres (pg-boss lives there too) → `docker-compose up`
is the whole install.

```
apps/web · apps/api · apps/scrumlord
packages/db · packages/domain · packages/sauron · packages/chaos · packages/shared
```

## Core entities

`Client → Project → Issue`, with `Status`, `Label`, `Sprint`, `Comment`, `User`/`Identity`/`Session`,
`Worklog`/`Timer`, `Rate`, `AuditLog`, `Outbox`. Money is integer **cents + currency**. Rates
resolve **issue → project → client → default**. Issue board order uses a fractional `rank`.
Client users are strictly isolated to their own client's data. (Details in the spec.)

## Milestones

| # | Milestone | Status |
|---|---|---|
| **M1** | Core tracker + time + money | 🚧 in progress |
| M2 | Client portal (read views of open/done/in-progress, time & money) | ⏳ planned |
| M3 | Notifications + **emergency paging** (`emergency` priority + Outbox seam ship in M1) | ⏳ planned |
| M4 | Inbound integrations: Grafana alerts→issues, WordPress→issues, auto-assign (`packages/chaos`) | ⏳ planned |
| M5 | Billing/accounting: invoices, exports, rate snapshotting | ⏳ planned |

## M1 build order (vertical slices, TDD, commit each)

1. Monorepo scaffold + tooling
2. `docker-compose` (Postgres + Mailpit)
3. `packages/db` Prisma schema + fictional seed
4. `packages/shared` Zod schemas + types
5. `apps/api` Fastify skeleton + `/health`
6. `packages/sauron` audit + port 666
7. Auth (magic-link + sessions, OIDC-ready)
8. Clients + Projects (+ isolation)
9. Issues (keys, types, comments)
10. Board + statuses + rank (drag-drop moves)
11. Sprints + backlog + velocity
12. Time tracking (worklogs + timers)
13. Money (rates + accrued cost)
14. Search + filter
15. `apps/scrumlord` worker jobs
16. `apps/web` frontend
17. README status honesty + end-to-end verify

## How to run (kept accurate to what actually works)

```bash
corepack enable pnpm
pnpm install
docker compose up -d            # postgres + mailpit
pnpm --filter @gira/db migrate  # apply migrations + seed
pnpm dev                        # api + scrumlord + web
```

_(This block is updated only as each piece actually runs. No aspirational instructions.)_

## House rules

GPL-3.0 header on new source files. Keep the README lore intact; update only the *Status*
column honestly as features land, jokes stay in *Reality*. Never leak client info — all
seed/demo data is fictional. No fake stubs; lore easter eggs are real working code.
