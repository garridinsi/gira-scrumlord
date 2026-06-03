#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Restore a gira-scrumlord Postgres dump (from ./scripts/backup.sh) into the running
# compose stack. DESTRUCTIVE: --clean --if-exists drops and recreates every object first.
#
# Usage (run from the repo root on the host):
#   ./scripts/restore.sh backups/gira-20260608-120000.dump --yes
#
# It stops api + scrumlord during the restore so nothing writes mid-restore, then brings
# them back up. An age-encrypted dump (.dump.age) is decrypted on the fly if AGE_KEY_FILE
# (an age identity file) is set.
#
# Env: COMPOSE_FILE, PG_SERVICE, PG_USER, PG_DB (same defaults as backup.sh), AGE_KEY_FILE.
set -euo pipefail

DUMP="${1:-}"
CONFIRM="${2:-}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.prod.yml}"
PG_SERVICE="${PG_SERVICE:-postgres}"
PG_USER="${PG_USER:-gira}"
PG_DB="${PG_DB:-gira}"

if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo "usage: ./scripts/restore.sh <dump-file> --yes" >&2
  exit 2
fi
if [ "$CONFIRM" != "--yes" ] && [ "${CONFIRM_RESTORE:-}" != "1" ]; then
  echo "REFUSING: this OVERWRITES the live '$PG_DB' database. Re-run with --yes (or CONFIRM_RESTORE=1) once you have a fresh backup." >&2
  exit 3
fi

dc() { docker compose -f "$COMPOSE_FILE" "$@"; }

# Decrypt on the fly if the dump is age-encrypted.
emit_dump() {
  case "$DUMP" in
    *.age)
      if [ -z "${AGE_KEY_FILE:-}" ]; then
        echo "dump is age-encrypted but AGE_KEY_FILE is not set" >&2
        exit 4
      fi
      age -d -i "$AGE_KEY_FILE" "$DUMP"
      ;;
    *) cat "$DUMP" ;;
  esac
}

echo "→ stopping api + scrumlord so nothing writes during the restore…"
dc stop api scrumlord >/dev/null 2>&1 || true

echo "→ restoring $DUMP into '$PG_DB' (drop + recreate objects)…"
# pg_restore reads the custom-format dump from stdin; --clean --if-exists makes it idempotent.
emit_dump | dc exec -T "$PG_SERVICE" pg_restore --clean --if-exists --no-owner -U "$PG_USER" -d "$PG_DB"

echo "→ bringing api + scrumlord back up…"
dc up -d api scrumlord >/dev/null
# The web container caches the api upstream IP; bounce it so /api stops 502ing (see RECOVERY.md).
dc restart web >/dev/null 2>&1 || true

echo "✓ restore complete. Verify: curl -s https://\$APP_HOST/api/health"
