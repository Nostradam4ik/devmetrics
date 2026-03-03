#!/bin/sh
# Analytics Service entrypoint — waits for DB + Redis, starts app.
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
  sleep "$WAIT"
done
echo "[entrypoint] PostgreSQL is ready."

echo "[entrypoint] Starting Analytics Service..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${UVICORN_WORKERS:-2}" \
  --log-level "${LOG_LEVEL:-info}"
