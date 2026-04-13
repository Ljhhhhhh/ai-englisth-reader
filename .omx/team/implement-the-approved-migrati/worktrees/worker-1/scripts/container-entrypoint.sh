#!/bin/sh
set -eu

if [ "${RUN_PRISMA_MIGRATIONS:-1}" = "1" ]; then
  if [ -d /app/prisma/migrations ]; then
    echo "[entrypoint] Running prisma migrate deploy"
    pnpm prisma migrate deploy
  else
    echo "[entrypoint] No prisma/migrations directory found; skipping prisma migrate deploy"
  fi
fi

if [ "${RUN_DB_SEED:-0}" = "1" ]; then
  echo "[entrypoint] Running seed import"
  pnpm db:seed
fi

exec pnpm exec next start --hostname 0.0.0.0 --port "${PORT:-3000}"
