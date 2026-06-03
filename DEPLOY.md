# Deploying `gira-scrumlord`

Self-hostable, GPL-3.0. The only hard dependency is **PostgreSQL** — pg-boss (the
`scrumlord` job queue) lives in the same database, so there's no Redis to run.

## One command (whole app, containers)

```bash
# build + run: postgres · api · scrumlord · sauron · web · mailpit
docker compose -f docker-compose.full.yml up --build

# ...with fictional demo data on first run (Acme Corp, a velociraptor PO):
docker compose -f docker-compose.full.yml --profile seed up --build
```

Then:

| Service          | URL                   | Notes                                    |
| ---------------- | --------------------- | ---------------------------------------- |
| **Web app**      | http://localhost:8080 | the SPA; nginx also proxies `/api` → api |
| **Sauron audit** | http://localhost:666  | read-only audit log (the canonical port) |
| **Mailpit**      | http://localhost:8025 | catches magic-link emails in this demo   |

Log in: open the web app, enter an email. On a **fresh** database the first email
becomes the admin; with the `seed` profile, log in as `boss@example.test`. The
magic link appears in Mailpit.

### How it fits together

- `web` (nginx, non-root) serves the static SPA and proxies `/api/*` to `api:3000`,
  so the browser uses **one origin** — the httpOnly session cookie works with
  `SameSite=Lax`, no CORS.
- `migrate` runs `prisma migrate deploy` once and exits; `api`/`scrumlord` wait for it.
- `sauron` binds `:6660` inside the container (non-root) and is published on host `:666`.
- All Node services run as the non-root `node` user from a single image.

## Production checklist

1. **Secrets:** set a strong, unique `SESSION_SECRET`
   (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`).
   The API **refuses to boot** in `NODE_ENV=production` while this is still a dev
   placeholder — that's intentional.
2. **TLS:** put a reverse proxy / TLS terminator in front of `web`, then set
   `APP_URL=https://your-host`. `COOKIE_SECURE` **defaults to `true`** under
   `NODE_ENV=production` (override only if you really terminate TLS elsewhere).
3. **Timezone:** set `BILLING_TIMEZONE` (IANA, e.g. `Europe/Madrid`) so monthly
   maintenance rollups bucket worklogs by your local calendar month.
4. **Webhooks:** keep `ALLOW_PRIVATE_WEBHOOKS=false` in production — the notifier
   refuses outbound calls to private/loopback hosts and re-checks the _resolved_
   IP (DNS-rebinding guard).
5. **Email:** point `SMTP_HOST`/`SMTP_PORT`/`MAIL_FROM` at a real mail server
   (drop the `mailpit` service).
6. **Database:** use managed Postgres or back up the `gira_pgdata` volume. Example
   logical backup/restore against the compose Postgres:
   ```bash
   docker compose -f docker-compose.full.yml exec -T postgres \
     pg_dump -U gira gira | gzip > gira-$(date +%F).sql.gz          # backup
   gunzip -c gira-2026-05-30.sql.gz | docker compose -f docker-compose.full.yml \
     exec -T postgres psql -U gira gira                              # restore
   ```
7. **Audit:** the `sauron` log is append-only — retain it (it's your compliance trail).
8. **Health check:** point your orchestrator at `GET /api/health` →
   `{ status, db, name, version }` (200 when the DB is reachable).

### Security posture (built in)

- **Multi-tenant isolation:** client users are always read-only viewers, scoped to
  their own client; they can never reach a staff write/config surface.
- **Rate limiting:** `/auth/magic-link`, `/auth/callback`, and `/intake/:sourceId`
  are throttled per IP.
- **CSRF:** cookie-authenticated mutations require a same-origin `Origin`.
- **Headers:** the API sets Helmet headers; nginx sets a strict CSP +
  `nosniff`/`DENY`/`no-referrer` on the SPA document.
- **Magic-link tokens & sessions:** 256-bit, stored only as SHA-256 hashes,
  single-use, constant-time compared, revocable, with expiry.

## Local development (no containers for the app)

```bash
corepack enable && pnpm install
cp .env.example .env
docker compose up -d                 # just postgres + mailpit
pnpm --filter @gira/db migrate       # schema + fictional seed
pnpm dev                             # api :3000 · scrumlord · sauron · web :5173
```

## CI

`.github/workflows/ci.yml` runs typecheck + the full test suite (against a Postgres
service) + builds on every push/PR.
