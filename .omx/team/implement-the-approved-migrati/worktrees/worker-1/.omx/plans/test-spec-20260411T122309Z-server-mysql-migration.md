# Test Specification: Server Deployment + MySQL + Account Sync Migration

## Metadata

- Paired PRD: `.omx/plans/prd-20260411T122309Z-server-mysql-migration.md`
- Date: 2026-04-11
- Scope: auth, MySQL migration, article storage, sync, generation ownership, ECS readiness

## Objectives

1. Preserve the current user-visible reading and generation behavior where it still applies.
2. Prove that identity changes from anonymous `deviceId` to authenticated user session do not regress reader or saved-word flows.
3. Prove that MySQL replaces SQLite, `localStorage`, cookie-only persistence, and file-backed runtime content for all launch-critical paths.
4. Prove that ECS deployment on Ubuntu-compatible operations can boot, migrate, and serve the app.

## Existing Behavior That Must Be Preserved

- Homepage still lists articles and opens the reader. See [tests/e2e/home.spec.ts](/Users/pipilu/Documents/MaDun/ai-english-read/tests/e2e/home.spec.ts#L3).
- Continue-reading still resumes the latest in-progress article, though the backing store changes from local to server. See [tests/e2e/home.spec.ts](/Users/pipilu/Documents/MaDun/ai-english-read/tests/e2e/home.spec.ts#L31).
- Reader still restores current stage, supports explanation, allows save/retry flows, and completes explicitly. See [tests/e2e/reader-flow.spec.ts](/Users/pipilu/Documents/MaDun/ai-english-read/tests/e2e/reader-flow.spec.ts#L25), [tests/e2e/reader-flow.spec.ts](/Users/pipilu/Documents/MaDun/ai-english-read/tests/e2e/reader-flow.spec.ts#L42), [tests/e2e/reader-flow.spec.ts](/Users/pipilu/Documents/MaDun/ai-english-read/tests/e2e/reader-flow.spec.ts#L143), [tests/e2e/reader-flow.spec.ts](/Users/pipilu/Documents/MaDun/ai-english-read/tests/e2e/reader-flow.spec.ts#L173).
- Words page still groups saved words by article. See [tests/e2e/reader-flow.spec.ts](/Users/pipilu/Documents/MaDun/ai-english-read/tests/e2e/reader-flow.spec.ts#L226).
- Generation jobs still follow the request -> async processing -> poll status pattern. See [src/app/api/generate/route.test.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/generate/route.test.ts#L68), [src/features/generation/generation-job-service.test.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/generation-job-service.test.ts#L83).

## Test Layers

### Unit

Add or update unit tests for:

- Auth token/signing helpers
  - login challenge creation, expiration, verification, replay rejection
  - JWT/session-cookie encode/decode and invalid signature handling
- Session identity resolvers
  - protected route rejects anonymous requests
  - authenticated request exposes `userId`
- Article repository mappers
  - DB row -> `Article` shape
  - `Article` shape -> DB create/update payload
  - JSON column validation with malformed nested payload rejection
- Progress, saved words, remembered items, and events repositories
  - create/update/fetch keyed by `userId`
  - no duplicate word records per user/article/lemma
  - continue-reading sort semantics preserved from [src/features/reader/progress-service.test.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/reader/progress-service.test.ts#L40)
- Generation repository rules
  - per-user quota counting
  - job ownership enforcement
  - generated article visibility constraints

### Integration

Add integration tests against Prisma + MySQL for:

- Migration boot
  - `prisma migrate deploy` succeeds on an empty MySQL database
  - seed/import populates required article rows and nested content
- Auth API
  - request verification code
  - verify code
  - create session cookie
  - reject expired/invalid codes
- Protected state APIs
  - authenticated progress read/write
  - authenticated saved word create/delete/list
  - authenticated event write/list
  - unauthenticated requests rejected with the intended status
- Article loaders
  - homepage article list reads from DB
  - reader route loads seeded article from DB
  - generated article route respects owner visibility
- Generation pipeline
  - generation POST creates a user-owned job
  - job transitions pending -> processing -> done/failed
  - generated article row is written to MySQL instead of filesystem

### E2E

Add Playwright coverage for:

1. Login happy path
   - request code
   - verify code
   - land on authenticated homepage
2. Cross-device sync
   - browser A logs in, starts an article, saves a word
   - browser B logs in as the same user
   - browser B sees continue-reading and the same saved word
3. Reader explain/save path in authenticated mode
   - current reader interactions still work after auth and server sync cutover
4. Saved words page
   - words remain grouped by article
   - delete/remember behavior works in authenticated mode
5. Generation ownership
   - user A generates an article and can open it
   - user B cannot access user A’s generated article or job
6. Anonymous access behavior
   - whichever paths remain public behave as intended
   - protected paths redirect or error consistently
7. Deployment smoke path
   - open homepage
   - login
   - open reader
   - save a word
   - submit generation
   - poll until completion

### Observability / Operational Verification

Add explicit checks for:

- structured auth logs for verification requests and failures
- structured generation job transition logs
- startup log proving DB connectivity and migration state
- ECS health check endpoint or route-level readiness behavior
- alertable signals for repeated auth verification failures and stuck generation jobs

## Test Data Strategy

- Seed MySQL with the current bundled articles using the upgraded import path rather than handcrafted fixtures wherever practical.
- Use dedicated test users for:
  - anonymous rejection checks
  - single-user happy path
  - cross-user ownership isolation
- Keep explain-route mocks where the test intent is UI flow rather than LLM correctness.

## Command Matrix

Expected automated verification commands after implementation:

1. `pnpm lint`
2. `pnpm test`
3. `pnpm build`
4. `pnpm prisma validate`
5. MySQL-backed integration suite
6. `pnpm test:e2e`

Expected deploy verification commands or steps:

1. `prisma migrate deploy`
2. seed/import command for bundled articles
3. app startup command used by ECS
4. smoke script or manual checklist against deployed URL

## Exit Criteria

The migration is not complete until all of the following are true:

- All launch-critical automated tests pass against the MySQL-backed implementation.
- Cross-device sync is proven with an authenticated multi-browser test.
- Generated article storage and ownership are proven end to end.
- No runtime code path used by launch-critical flows depends on SQLite, localStorage source-of-truth, cookie-only persistence, or filesystem article writes.
- ECS deployment steps are documented and at least one deployment smoke pass succeeds.

## Known Gaps To Eliminate During Execution

- Current tests still encode device-local copy and behavior, for example “已保存到本机”. Those assertions must be updated only after the server-backed UX is intentionally revised. See [tests/e2e/reader-flow.spec.ts](/Users/pipilu/Documents/MaDun/ai-english-read/tests/e2e/reader-flow.spec.ts#L57).
- Current generation tests only cover device-based quotas and ownership-less job creation. They must be expanded for authenticated ownership. See [src/app/api/generate/route.test.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/generate/route.test.ts#L52).
- Current article seed only persists top-level fields, not the full nested payload. Import verification must cover nested content. See [prisma/seed.ts](/Users/pipilu/Documents/MaDun/ai-english-read/prisma/seed.ts#L9).
