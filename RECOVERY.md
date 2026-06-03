<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# Recovery & backups

The only stateful thing in a gira-scrumlord deployment is the Postgres database (the
`gira_pgdata` volume). Everything else — images, config, the cloudflared tunnel — is
rebuildable from the repo + `deploy/.env`. So the recovery story is: **back up the
database, keep a copy offsite, and know how to restore it.**

> All commands run from the repo root on the host (e.g. `~/gira-scrumlord`), where
> `docker compose -f deploy/docker-compose.prod.yml` reaches the stack.

## Back up

```bash
./scripts/backup.sh
```

Writes a timestamped, restorable custom-format dump to `./backups/gira-<ts>.dump` and
prunes to the newest `RETENTION` (default 14). Options (env): `BACKUP_DIR`, `RETENTION`,
and `AGE_RECIPIENT` to encrypt at rest with [`age`](https://github.com/FiloSottile/age).

**A backup on the same host is not a backup.** Copy `./backups` offsite. Two easy ways:

- `rclone copy ./backups remote:gira-backups` (S3/B2/Drive/etc), or
- `restic backup ./backups` to an encrypted restic repo.

### Schedule it (cron)

```cron
# 03:17 daily: dump, then push offsite. Logs to /var/log/gira-backup.log.
17 3 * * * cd /home/eneko/gira-scrumlord && ./scripts/backup.sh >> /var/log/gira-backup.log 2>&1 && rclone copy ./backups remote:gira-backups >> /var/log/gira-backup.log 2>&1
```

### Verify a backup restores (do this periodically — an untested backup is a guess)

Spin a throwaway Postgres, restore into it, and sanity-check a table:

```bash
docker run -d --name gira-restore-test -e POSTGRES_USER=gira -e POSTGRES_PASSWORD=x -e POSTGRES_DB=gira postgres:16-alpine
sleep 5
cat backups/gira-<ts>.dump | docker exec -i gira-restore-test pg_restore --clean --if-exists --no-owner -U gira -d gira
docker exec gira-restore-test psql -U gira -d gira -c 'SELECT count(*) FROM "User";'
docker rm -f gira-restore-test
```

## Restore (DESTRUCTIVE — overwrites the live DB)

```bash
./scripts/restore.sh backups/gira-<ts>.dump --yes
```

It stops `api` + `scrumlord` during the restore, runs `pg_restore --clean --if-exists`,
brings them back up, and bounces `web`. For an `age`-encrypted dump set `AGE_KEY_FILE`.
Always take a fresh `./scripts/backup.sh` first.

## Disaster scenarios

### The database volume is lost / corrupted (or a fresh host)

1. Clone the repo, restore `deploy/.env` and `deploy/cloudflared/` from your secret store.
2. `docker compose -f deploy/docker-compose.prod.yml up -d postgres` (creates an empty volume; the `migrate` service will also run on a full `up`).
3. `./scripts/restore.sh backups/gira-<ts>.dump --yes` (fetch the dump from offsite first).
4. `docker compose -f deploy/docker-compose.prod.yml up -d` to bring the whole stack up.
5. Verify: `curl -s https://$APP_HOST/api/health` → `{"status":"ok","db":true,...}`.

### A migration went bad

Migrations are additive and applied by the one-shot `migrate` service on deploy. If a
release ships a broken migration:

1. Restore the pre-deploy dump (take one **before every deploy** — see below).
2. Check out the previous good commit, rebuild, redeploy.

**Back up before migrating** — fold this into the deploy:

```bash
./scripts/backup.sh && git pull && docker compose -f deploy/docker-compose.prod.yml up -d --build
```

### Secrets lost (SESSION_SECRET / POSTGRES_PASSWORD)

- `POSTGRES_PASSWORD`: it must match the value baked into the existing volume. If the
  volume survives, you need the original password; if you're restoring into a fresh
  volume you can choose a new one (set it in `.env` before `up`).
- `SESSION_SECRET`: rotating it invalidates all sessions (everyone re-logs-in via magic
  link) — harmless. Set a new strong value in `.env` and `up -d` the app.

## Gotcha: `/api/*` returns 502 after a partial deploy

If you rebuild/recreate only `api`, the long-running `web` container's nginx keeps the
old `api` IP and every `/api/*` request 502s (the homepage still serves). Fix:

```bash
docker compose -f deploy/docker-compose.prod.yml restart web
```

`restore.sh` already does this for you.

See also `deploy/DEPLOY-PROD.md` for the full deploy/runbook.
