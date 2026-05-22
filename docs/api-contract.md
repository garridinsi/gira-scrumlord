# gira-scrumlord — Frontend API Contract

> For whoever builds the UI (e.g. Claude Design). This is the exact, current
> contract the `@gira/api` backend serves. The shipped `apps/web` is a reference
> implementation; a new frontend should target this document.

## Ground rules

- **Base URL:** `import.meta.env.VITE_API_URL` (dev default `http://localhost:3000`).
- **Auth is cookie-based.** Every request must send `credentials: 'include'`. There is **no** `Authorization` header and **no token in localStorage** — the session lives in an httpOnly cookie the browser sends automatically. CORS is configured for the SPA origin with credentials.
- **JSON everywhere.** Request bodies are JSON; responses are JSON.
- **Money is integer minor units (cents) + an ISO-4217 `currency` string.** Never treat it as a float. Format with `new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100)`.
- **Dates are ISO-8601 strings** on the wire.
- **Dark mode only.** It's lore; honor it.
- **Types are published.** Import response/request types and enums from the `@gira/shared` workspace package — do not hand-redefine them. Key exports: `UserView`, `IssueView`, `BoardView`, `BoardColumn`, `StatusView`, `LabelView`, `SprintView`, `VelocityView`, `CommentView`, `WorklogView`, `TimerView`, `CostView`, `ProjectSummaryView`; enums `issueType`, `priority`, `statusCategory`, `userKind`, `userRole`, `billingMode`, `sprintState`; and the Zod request schemas (`createIssueSchema`, `updateIssueSchema`, `moveIssueSchema`, `createWorklogSchema`, `upsertRateSchema`, …).

## Error shape

Non-2xx responses are JSON. Common forms:

```jsonc
{ "error": "validation_error", "issues": [ /* Zod issues */ ] }   // 400
{ "error": "authentication required" }                            // 401
{ "error": "not your project" }                                   // 403
{ "error": "not_found", "path": "/..." }                          // 404
{ "error": "already_exists", "target": ["key"] }                  // 409
```

## Auth flow (passwordless magic link)

1. `POST /auth/magic-link` `{ email }` → **always `202`** (never reveals whether the email exists). In dev the email lands in **Mailpit at http://localhost:8025**; the link is `${APP_URL}/auth/callback?token=…`.
2. Your `/auth/callback` route reads `?token=`, then `POST /auth/callback` `{ token }` → `200 { user: UserView }` and sets the session cookie.
3. `GET /auth/me` → `200 { user: UserView }` if signed in, else `401`. Use this to gate the app on load.
4. `POST /auth/logout` → `204`, clears the cookie.

**Bootstrap:** on a fresh install the first email to request a link becomes an `admin`. After that it's known-users-only (admins create the rest).

Seed login for local dev: **`boss@example.test`** (admin).

## Roles & visibility (the UI must respect this)

- `role`: `admin` | `member` | `viewer`. `kind`: `staff` | `client`.
- **Write** actions (create/edit/move/delete issues, projects, sprints, worklogs, timers, rates) require `admin` or `member`. `viewer` is read-only → hide/disable those controls.
- **Client users** (`kind: 'client'`) only ever receive their own client's data from the API. **Hide all rate configuration from clients** — `GET /rates` returns `403` for them. They *may* read cost/summary for their own projects and may comment.

## Endpoints

### Users / clients
- `GET /users` → `UserView[]` (assignee pickers; scoped — clients see only their own people)
- `GET /clients` → admin only; `POST /clients` (`createClientSchema`); `GET|PATCH|DELETE /clients/:id`

### Projects / workflow
- `GET /projects` → projects (scoped) with `{ client }` summary
- `POST /projects` (`createProjectSchema`) → creates project + seeds 5 default statuses
- `GET /projects/:key` → project incl. `statuses`, `labels`, `client`
- `PATCH|DELETE /projects/:key`
- `GET|POST /projects/:key/statuses` (`createStatusSchema`); `PATCH|DELETE /statuses/:id`
- `GET|POST /projects/:key/labels` (`createLabelSchema`); `DELETE /labels/:id`

### Board / issues
- `GET /projects/:key/board` → `BoardView` = `{ projectKey, columns: BoardColumn[] }`, issues pre-sorted by rank
- `GET /issues?projectKey&statusId&assigneeId&type&priority&labelId&sprintId&q&limit` → `IssueView[]`
- `POST /issues` (`createIssueSchema`) → `IssueView` (key auto-assigned `PROJ-N`)
- `GET|PATCH|DELETE /issues/:key` (`updateIssueSchema`)
- `POST /issues/:key/move` (`moveIssueSchema`) → `IssueView`
- `GET|POST /issues/:key/comments` (`createCommentSchema`) → `CommentView[]` / `CommentView`

### Drag-and-drop move — important
`POST /issues/:key/move` body: `{ statusId?, sprintId?, beforeId?, afterId? }`.
- `statusId`: target column (omit to stay in current column).
- `beforeId` / `afterId`: the **issue keys** directly above / below the drop point. The server computes the fractional rank between them. Omit both to append to the column end. The server validates and falls back gracefully — you just send the two neighbours from where the card was dropped.
- Moving into a `done`-category status sets `closedAt`; moving out clears it.

### Sprints / backlog
- `GET|POST /projects/:key/sprints` (`createSprintSchema`) → `SprintView[]` (each includes live `velocity`)
- `GET /projects/:key/backlog` → `IssueView[]` (issues with no sprint)
- `GET|PATCH|DELETE /sprints/:id`; `POST /sprints/:id/start`; `POST /sprints/:id/close`
  - start snapshots `committedPoints`; close snapshots `completedPoints`.

### Time
- `GET|POST /issues/:key/worklogs` (`createWorklogSchema`) → `WorklogView[]` / `WorklogView`
- `GET /timers/active` → `TimerView | null` (poll ~30s to drive a running indicator)
- `POST /timers/start` `{ issueKey }` → `TimerView` (**`409` if one is already running** — only one active timer per user)
- `POST /timers/stop` → `WorklogView` (writes elapsed minutes, clears the timer)

### Money
- `GET /rates` (staff); `POST /rates` (`upsertRateSchema`, upsert per scope); `DELETE /rates/:id`
- `GET /issues/:key/cost` → `CostView` `{ minutes, billableMinutes, billingMode, hourlyCents, currency, accruedCents }`
- `GET /projects/:key/summary` → `ProjectSummaryView` (time + money + open/done counts + active-sprint velocity)

### Audit (separate read-only service — `sauron`)
- `GET http://localhost:666/audit?entityType&entityId&action&limit` → `{ count, entries }` (read-only; non-GET → `405`). Optional for an admin "activity" view.

## Lore cues to honor (real behaviors, not decoration)
- **`priority: 'emergency'`** is the top tier — make it visually loud (red/pulse). It triggers backend paging seams.
- **WIP warning:** when an `in_progress`-category column holds **> 5** issues, show a real, dismissible warning ("columns explode"). It's a documented game mechanic.
- **Velocity** is committed-vs-completed points; the brand renders it as a 🌀 hurricane.
- Accent purple `#8b5cf6` and the tornado 🌀 are the brand.

## Local dev
```bash
docker compose up -d            # postgres + mailpit
pnpm --filter @gira/db migrate  # schema + fictional seed
pnpm --filter @gira/api dev     # API on :3000
# UI dev server points VITE_API_URL at http://localhost:3000
# log in as boss@example.test, click the link in Mailpit (:8025)
```
