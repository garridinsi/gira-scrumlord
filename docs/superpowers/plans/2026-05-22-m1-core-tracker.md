# M1 Core Tracker — Implementation Plan

> **For agentic workers:** Implement task-by-task with TDD. Steps use `- [ ]` for tracking.

**Goal:** Ship a self-hostable Jira-style issue tracker with time tracking and money/billing baked into the data model.

**Architecture:** pnpm monorepo. Fastify REST API + Prisma/Postgres + pg-boss worker + React/Vite frontend. Passwordless magic-link auth with server sessions, OIDC-ready. Read-only audit log on port 666.

**Tech Stack:** TypeScript, Fastify, Prisma, PostgreSQL 16, Zod, pg-boss, nodemailer/Mailpit, React, Vite, Tailwind, @dnd-kit, TanStack Query, Vitest.

---

## Conventions

- Every package is `@gira/<name>`, ESM, `"type": "module"`, TS strict.
- New source files get the short GPL-3.0 header (see `scripts/gpl-header.txt`).
- TDD: failing test → run (red) → minimal impl → run (green) → commit. Commit per slice.
- Money is integer cents + ISO currency. Never floats.
- All API inputs validated with Zod from `@gira/shared`. All mutations call `audit.record(...)`.

## Critical domain code (write these with unit tests first)

### Issue key generation (`packages/domain/src/issue-key.ts`)
Atomic counter on the project row inside the create transaction:
```ts
// in a prisma $transaction:
const p = await tx.project.update({
  where: { id: projectId },
  data: { issueCounter: { increment: 1 } },
  select: { key: true, issueCounter: true },
});
const issueKey = `${p.key}-${p.issueCounter}`;
```
Test: two concurrent creates produce `PROJ-1` and `PROJ-2`, never a duplicate.

### LexoRank (`packages/domain/src/rank.ts`)
Fractional ordering for drag-drop. `rankBetween(a?, b?)` returns a string strictly between `a` and `b` (base-36 midpoint), `rankFirst`/`rankLast` helpers, and `needsRebalance(ranks)`.
Tests: `rankBetween(undefined, undefined)` is non-empty; `a < rankBetween(a,b) < b` lexicographically; inserting 100 times between the same two keys never collides.

### Rate resolution (`packages/domain/src/rate.ts`)
```ts
resolveHourlyCents({ issue, project, client, default }) // first defined wins, issue→project→client→default
accruedCents({ billingMode, fixedPriceCents, billableMinutes, hourlyCents })
// fixed → fixedPriceCents; hourly → Math.round(billableMinutes/60 * hourlyCents)
```
Tests: issue rate beats project beats client beats default; fixed mode ignores minutes; rounding (90 min @ 10000¢/h = 15000¢; 1 min @ 10000 = 167¢).

### Velocity (`packages/domain/src/velocity.ts`)
`velocity(sprint, issues)` → `{ committedPoints, completedPoints, completedCount }` where completed = issue.status.category === 'done'.

---

## Tasks (vertical slices)

### Task 1 — Monorepo scaffold
**Files:** `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.editorconfig`, `.npmrc`, `scripts/gpl-header.txt`, `.prettierrc`, `eslint.config.js`.
- [ ] Root `package.json` with workspace scripts (`dev`, `build`, `test`, `lint`), packageManager pnpm.
- [ ] `pnpm-workspace.yaml` → `apps/*`, `packages/*`.
- [ ] `tsconfig.base.json` strict, NodeNext, composite.
- [ ] `pnpm install`, commit `chore: scaffold pnpm monorepo`.

### Task 2 — docker-compose
**Files:** `docker-compose.yml`, `.env.example`.
- [ ] Postgres 16 (named volume, healthcheck), Mailpit (1025/8025). `DATABASE_URL`, SMTP vars in `.env.example`.
- [ ] `docker compose up -d` healthy; commit.

### Task 3 — packages/db (Prisma)
**Files:** `packages/db/prisma/schema.prisma`, `packages/db/src/index.ts`, `packages/db/prisma/seed.ts`.
- [ ] Schema = all entities from the spec §4. Enums: IssueType, Priority, StatusCategory, UserKind, UserRole, BillingMode, RateScope, SprintState.
- [ ] `prisma migrate dev --name init`. Export singleton `prisma` client.
- [ ] Seed **fictional** data: client "Acme Corp", staff admin `boss@example.test`, project `GIRA` with 5 statuses, labels, a sprint, ~8 issues incl. one `emergency`, some worklogs, rates. Commit.

### Task 4 — packages/shared (Zod)
**Files:** `packages/shared/src/{enums,issue,auth,project,worklog,rate}.ts`, `index.ts`.
- [ ] Zod schemas + inferred types mirroring API surface §5. Commit.

### Task 5 — apps/api skeleton
**Files:** `apps/api/src/{app,server,config,plugins/security,plugins/errors,routes/health}.ts`, `apps/api/test/health.test.ts`.
- [ ] Fastify factory `buildApp()`, config via env (Zod-validated), `@fastify/helmet`, `@fastify/cookie`, central error handler mapping ZodError→400, not-found→404.
- [ ] `/health` returns `{status:'ok', db: <bool>}`. Test with `app.inject`. Commit.

### Task 6 — packages/sauron
**Files:** `packages/sauron/src/{record,server}.ts`, test.
- [ ] `audit.record(tx, {actorId, action, entityType, entityId, before, after})` inserts AuditLog.
- [ ] Tiny Fastify on **port 666**: `GET /health`, `GET /audit` (read-only, paginated). Test record + query. Commit.

### Task 7 — Auth slice (TDD)
**Files:** `apps/api/src/modules/auth/{service,routes,session,cookies}.ts`, `packages/domain/src/token.ts`, tests.
- [ ] `token.ts`: `generateToken()`→{raw, hash}, `hashToken(raw)` (sha256). Test hash determinism.
- [ ] Magic-link service: request creates MagicLinkToken (15-min TTL) for email, upserts User+Identity(magic-link), emails link via nodemailer. Always 202 (no enumeration).
- [ ] Callback: verify token (unconsumed, unexpired), mark consumed, create Session, set httpOnly cookie. `/auth/me`, `/auth/logout`.
- [ ] `requireAuth` preHandler resolves session→user. Tests: full happy path, expired token rejected, reused token rejected, logout clears session. Commit.

### Task 8 — Clients + Projects (TDD)
**Files:** `apps/api/src/modules/{clients,projects}/...`, `apps/api/src/lib/scope.ts`, tests.
- [ ] Clients CRUD (admin only). Projects CRUD; on create, seed 5 default Statuses.
- [ ] `scope.ts`: `assertCanAccessProject(user, project)` — client users limited to their clientId. Test: client A 403 on client B's project. Commit.

### Task 9 — Issues (TDD)
**Files:** `apps/api/src/modules/issues/...`, tests.
- [ ] Create (atomic key), get by key, patch, delete, list. Labels M:N, parent for epics. Comments sub-resource.
- [ ] Tests: key sequence, scope enforced, markdown body stored verbatim. Commit.

### Task 10 — Board + rank (TDD)
**Files:** `apps/api/src/modules/board/...`, uses `domain/rank`.
- [ ] `GET /projects/:key/board` → columns by status, issues sorted by rank. `POST /issues/:key/move` sets statusId/rank/sprintId atomically, audits.
- [ ] Tests: move reorders correctly; moving to done sets closedAt. Commit.

### Task 11 — Sprints + velocity (TDD)
- [ ] Sprint CRUD/state transitions, backlog endpoint, `GET /projects/:key/summary` includes velocity. Tests for committed vs completed. Commit.

### Task 12 — Time (TDD)
- [ ] Worklog create/list; timer start/stop (unique active per user; stop computes minutes, writes worklog). Rollups. Tests incl. "cannot start two timers". Commit.

### Task 13 — Money (TDD)
- [ ] Rate CRUD (scoped); `GET /issues/:key/cost` and project summary money rollup using `domain/rate`. Tests: resolution order, fixed vs hourly. Commit.

### Task 14 — Search/filter
- [ ] `GET /issues` filters (status/assignee/type/priority/label/sprint/q). Test combinations. Commit.

### Task 15 — apps/scrumlord
**Files:** `apps/scrumlord/src/{index,jobs/*}.ts`.
- [ ] pg-boss bootstrap; jobs: `sprint.autoclose`, `timer.reap`, `outbox.dispatch`, `velocity.snapshot` on schedules. Test job handlers as pure-ish functions. Commit.

### Task 16 — apps/web
**Files:** `apps/web/src/...`.
- [ ] Vite+React+Tailwind dark theme; api client; login (magic-link), board (@dnd-kit), backlog, issue drawer (view/edit/comments/worklogs/cost), sprints, project summary (time+money+velocity 🌀). Commit per page.

### Task 17 — README + verify
- [ ] Update README *Status* column honestly (jokes stay in *Reality*); accurate install block. `pnpm test` green; full `docker compose up` + `pnpm dev` smoke. Commit.

## Self-review notes
- Spec coverage: every §5 endpoint maps to Tasks 7–14; lore (§7) to Tasks 6 & 15; isolation (§6) to Task 8. ✅
- Money never float (Task 13 + domain tests). ✅
- Seeds fictional only (Task 3). ✅
