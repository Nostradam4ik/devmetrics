#!/bin/sh
# Auth Service entrypoint — waits for DB, runs Alembic migrations, starts app.
set -e

RETRIES=30
WAIT=2

echo "[entrypoint] Waiting for PostgreSQL..."
until pg_isready -h "${POSTGRES_HOST:-postgres}" -U "${POSTGRES_USER:-devmetrics}" -q; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "[entrypoint] ERROR: PostgreSQL not ready after timeout."
    exit 1
  fi
  echo "[entrypoint] PostgreSQL not ready — retrying in ${WAIT}s ($RETRIES left)..."
  sleep "$WAIT"
done
echo "[entrypoint] PostgreSQL is ready."

echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head
echo "[entrypoint] Migrations complete."

echo "[entrypoint] Starting Auth Service..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${UVICORN_WORKERS:-2}" \
  --log-level "${LOG_LEVEL:-info}"
