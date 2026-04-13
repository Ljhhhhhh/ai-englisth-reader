# ECS Ubuntu deployment baseline

This document is the lane-4 deployment runbook for the approved server/MySQL migration. It intentionally focuses on container packaging, rollout order, and smoke verification. Auth, MySQL schema changes, and server-backed reader flows must be merged before using this runbook for a real release.

## Goals

- Ship one Next.js container image for ECS.
- Run Prisma migrations at container startup when migration files are present.
- Expose a readiness endpoint at `/api/health` for ECS health checks.
- Keep production startup container-first so the same image works on Ubuntu-backed ECS hosts.

## Container artifacts

- `Dockerfile` — multi-stage build for Next.js production runtime.
- `.dockerignore` — trims local and test-only files from the build context.
- `scripts/container-entrypoint.sh` — optional migrate/seed bootstrap before `next start`.
- `scripts/http-healthcheck.mjs` — readiness probe target for Docker/ECS.
- `src/app/api/health/route.ts` — JSON readiness endpoint.

## Required environment variables

The migration lanes will expand this list, but the deploy surface should already reserve the following values:

- `DATABASE_URL` — MySQL connection string used by Prisma.
- `LLM_API_KEY` — required for generation endpoints.
- `LLM_BASE_URL` — optional override for the LLM gateway.
- `LLM_MODEL` — optional override for the generation model.
- `PORT` — container listen port (defaults to `3000`).
- `RUN_PRISMA_MIGRATIONS` — set to `0` to skip `prisma migrate deploy`.
- `RUN_DB_SEED` — set to `1` for one-off content import in non-prod or first boot environments.
- `HEALTHCHECK_URL` — optional override if the container should probe a non-default readiness URL.
- `HEALTHCHECK_TIMEOUT_MS` — optional probe timeout in milliseconds.

## Build and local container smoke

```bash
docker build -t lexora:local .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL='mysql://user:pass@host.docker.internal:3306/lexora' \
  -e LLM_API_KEY='replace-me' \
  lexora:local
```

In another terminal:

```bash
node scripts/http-healthcheck.mjs
curl http://127.0.0.1:3000/api/health
```

## ECS task definition guidance

- Use the image built from `Dockerfile` as the only application container.
- Point the ECS health check to `GET /api/health`.
- Use a security group that allows outbound access to MySQL and the LLM provider.
- Keep one environment or sidecar mechanism for secrets injection; do not bake secrets into the image.
- Prefer one-off migration/seed tasks for first deploys even though the entrypoint can run them.

## Recommended rollout order

1. Provision the MySQL database and credentials.
2. Build and push the application image.
3. Run `prisma migrate deploy` against the target database.
4. Run the seed/import command once if the environment needs bundled article data.
5. Deploy/update the ECS service.
6. Wait for `/api/health` to report `status: ok`.
7. Execute the manual smoke checklist in `docs/testing/server-migration-smoke-checklist.md`.

## Async generation note

The approved PRD keeps generation interface-compatible while deferring the final worker topology decision. Until a dedicated worker/task exists, treat in-process generation as a launch risk and watch for stuck jobs after deploy.
