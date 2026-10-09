#!/usr/bin/env bash
# DocBrief Cloud Agent start: bring up local Postgres on every boot.
# Idempotent: exits cleanly if the server is already running.
set -euo pipefail

PG_MAJOR=16
PGBIN="/usr/lib/postgresql/${PG_MAJOR}/bin"
PGDATA="/var/lib/postgresql/docbrief"

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "[start] Postgres data dir missing — run install first." >&2
  exit 1
fi

if "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
  echo "[start] Postgres already running."
  exit 0
fi

# Clear any stale lock/pid left over from a snapshot restore, then start.
rm -f "$PGDATA/postmaster.pid"
"$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGDATA/server.log" -w start
echo "[start] Postgres started."
