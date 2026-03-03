#!/bin/sh
# AI Service entrypoint — waits for DB, starts app.
set -e

RETRIES=20
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

echo "[entrypoint] Starting AI Service..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${UVICORN_WORKERS:-1}" \
  --log-level "${LOG_LEVEL:-info}"
