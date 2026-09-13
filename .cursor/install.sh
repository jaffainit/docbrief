#!/usr/bin/env bash
# DocBrief Cloud Agent install: idempotent dependency + local Postgres setup.
# Safe to run from a fresh default image or from a prebuilt snapshot.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

PG_MAJOR=16
PGBIN="/usr/lib/postgresql/${PG_MAJOR}/bin"
PGDATA="/var/lib/postgresql/docbrief"
DB_NAME="docbrief"
DB_USER="$(id -un)"

echo "[install] repo: $REPO_DIR (user: $DB_USER)"

# 1. System packages: PostgreSQL (app + Prisma need a Postgres server).
if [ ! -x "$PGBIN/pg_ctl" ]; then
  echo "[install] installing PostgreSQL ${PG_MAJOR}..."
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
fi

# 2. Bun (pinned package manager from package.json).
if [ ! -x "$HOME/.bun/bin/bun" ]; then
  echo "[install] installing Bun 1.4.0..."
  curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.0"
fi
export PATH="$HOME/.bun/bin:$PATH"

# 3. Postgres data directory owned by the runtime user (no sudo needed at boot).
sudo mkdir -p /var/lib/postgresql
sudo chown -R "$DB_USER":"$(id -gn)" /var/lib/postgresql
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "[install] initializing Postgres cluster at $PGDATA..."
  "$PGBIN/initdb" -D "$PGDATA" -U "$DB_USER" \
    --auth=trust --auth-host=trust --auth-local=trust >/dev/null
  sed -i "/^port = /d; /^listen_addresses = /d; /^unix_socket_directories = /d" \
    "$PGDATA/postgresql.conf"
  cat >> "$PGDATA/postgresql.conf" <<'EOF'
port = 5432
listen_addresses = '127.0.0.1'
unix_socket_directories = '/tmp'
EOF
fi

# 4. Start Postgres so migrations can run (start.sh re-launches it on every boot).
if ! "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
  rm -f "$PGDATA/postmaster.pid"
  "$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGDATA/server.log" -w start
fi

# 5. Create the application database if it does not exist.
if ! "$PGBIN/psql" -U "$DB_USER" -h 127.0.0.1 -p 5432 -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  "$PGBIN/createdb" -U "$DB_USER" -h 127.0.0.1 -p 5432 "$DB_NAME"
fi

# 6. Local, non-secret env file (localhost trust-auth Postgres).
if [ ! -f .env ]; then
  echo "[install] writing local .env..."
  cat > .env <<EOF
# Local Cloud Agent dev environment (generated). Localhost trust-auth Postgres — no secrets.
DATABASE_URL="postgresql://${DB_USER}@127.0.0.1:5432/${DB_NAME}?schema=public"
DIRECT_URL="postgresql://${DB_USER}@127.0.0.1:5432/${DB_NAME}?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF
fi

# 7. JS dependencies (postinstall runs `prisma generate`).
echo "[install] bun install..."
bun install

# 8. Apply database migrations (idempotent).
echo "[install] prisma migrate deploy..."
bunx prisma migrate deploy

echo "[install] done."
