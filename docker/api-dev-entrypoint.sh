#!/bin/sh
set -eu

STUDIO_PORT="${DRIZZLE_STUDIO_PORT:-4983}"
APP_PORT="${PORT:-3000}"
MIGRATE_RETRIES="${MIGRATE_RETRIES:-10}"

run_migrations() {
  attempt=1
  while [ "$attempt" -le "$MIGRATE_RETRIES" ]; do
    echo "Running Drizzle migrations (attempt ${attempt}/${MIGRATE_RETRIES})..."
    if bunx drizzle-kit migrate --config=drizzle.config.ts; then
      return 0
    fi

    if [ "$attempt" -eq "$MIGRATE_RETRIES" ]; then
      echo "Drizzle migrations failed after ${MIGRATE_RETRIES} attempts."
      return 1
    fi

    echo "Migration attempt failed, retrying..."
    attempt=$((attempt + 1))
  done
}

run_migrations

echo "Starting Drizzle Studio on 0.0.0.0:${STUDIO_PORT}..."
bunx drizzle-kit studio --config=drizzle.config.ts --host=0.0.0.0 --port="${STUDIO_PORT}" &
STUDIO_PID=$!

echo "Starting API on 0.0.0.0:${APP_PORT}..."
bun run src/index.ts &
API_PID=$!

cleanup() {
  kill "${STUDIO_PID}" "${API_PID}" 2>/dev/null || true
}

trap cleanup INT TERM
wait "${API_PID}"
