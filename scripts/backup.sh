#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Back up the gira-scrumlord Postgres database from the running compose stack.
# Produces a timestamped custom-format dump (pg_dump -Fc, restorable with pg_restore)
# under BACKUP_DIR, prunes to the most recent RETENTION files, and — if AGE_RECIPIENT is
# set — encrypts the dump at rest with `age`.
#
# Usage (run from the repo root on the host):
#   ./scripts/backup.sh
#
# Env (all optional):
#   COMPOSE_FILE   compose file (default: deploy/docker-compose.prod.yml)
#   PG_SERVICE     postgres service name (default: postgres)
#   PG_USER/PG_DB  role/db (default: gira/gira)
#   BACKUP_DIR     where dumps are written (default: ./backups)
#   RETENTION      how many dumps to keep (default: 14)
#   AGE_RECIPIENT  if set, encrypt with `age -r "$AGE_RECIPIENT"` → .dump.age
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.prod.yml}"
PG_SERVICE="${PG_SERVICE:-postgres}"
PG_USER="${PG_USER:-gira}"
PG_DB="${PG_DB:-gira}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION="${RETENTION:-14}"

ts="$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
out="$BACKUP_DIR/gira-$ts.dump"

echo "→ dumping $PG_DB from compose service '$PG_SERVICE'…"
# -T: no TTY (pipe-safe). -Fc: custom format (compressed + selective restore).
docker compose -f "$COMPOSE_FILE" exec -T "$PG_SERVICE" \
  pg_dump -U "$PG_USER" -d "$PG_DB" -Fc >"$out"

if [ -n "${AGE_RECIPIENT:-}" ]; then
  echo "→ encrypting with age for $AGE_RECIPIENT…"
  age -r "$AGE_RECIPIENT" -o "$out.age" "$out"
  rm -f "$out"
  out="$out.age"
fi

size="$(du -h "$out" | cut -f1)"
echo "✓ backup written: $out ($size)"

# Prune: keep the newest $RETENTION dumps (encrypted or not), delete the rest.
echo "→ pruning to the newest $RETENTION dumps in $BACKUP_DIR…"
ls -1t "$BACKUP_DIR"/gira-*.dump "$BACKUP_DIR"/gira-*.dump.age 2>/dev/null |
  tail -n +"$((RETENTION + 1))" |
  while read -r old; do
    echo "  removing $old"
    rm -f "$old"
  done

echo "✓ done. Copy $BACKUP_DIR offsite (see RECOVERY.md) — a backup on the same host is not a backup."
