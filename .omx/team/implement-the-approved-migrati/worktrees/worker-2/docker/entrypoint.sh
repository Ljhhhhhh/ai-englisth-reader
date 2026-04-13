#!/bin/sh
set -eu

if [ "${RUN_PRISMA_MIGRATE_DEPLOY:-0}" = "1" ]; then
  echo "[entrypoint] running prisma migrate deploy"
  pnpm prisma migrate deploy
fi

if [ "${RUN_PRISMA_SEED:-0}" = "1" ]; then
  echo "[entrypoint] running prisma seed/import"
  pnpm db:seed
fi

exec pnpm start
