# PRD: Server Deployment + MySQL + Account Sync Migration

## Metadata

- Source spec: `.omx/specs/deep-interview-server-mysql-migration-20260411.md`
- Planning mode: `ralplan` consensus, deliberate tier
- Date: 2026-04-11
- Status: approved for execution handoff

## Requirements Summary

Upgrade the current local-first Next.js MVP into a launchable online product deployed on ECS with MySQL as the source of truth, account-based login, and cross-device sync for progress and saved words. Preserve the current homepage, reader, saved-words flow, AI explain flow, and async article generation while removing runtime dependence on SQLite, `localStorage`, cookie-only persistence, and file-backed generated content.

## Brownfield Baseline

- Prisma is present, but the datasource is still SQLite and every persisted user-facing record is keyed by anonymous `deviceId`, not account identity. See [prisma/schema.prisma](/Users/pipilu/Documents/MaDun/ai-english-read/prisma/schema.prisma#L5), [prisma/schema.prisma](/Users/pipilu/Documents/MaDun/ai-english-read/prisma/schema.prisma#L26), [prisma/schema.prisma](/Users/pipilu/Documents/MaDun/ai-english-read/prisma/schema.prisma#L41), [prisma/schema.prisma](/Users/pipilu/Documents/MaDun/ai-english-read/prisma/schema.prisma#L69), [prisma/schema.prisma](/Users/pipilu/Documents/MaDun/ai-english-read/prisma/schema.prisma#L84).
- Runtime DB access is hard-wired to `@prisma/adapter-better-sqlite3`, which must disappear before MySQL deployment. See [src/lib/db.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/db.ts#L1).
- Articles are still loaded from `content/articles/*.json` via filesystem traversal, and generated articles are written back to disk. See [src/lib/content/load-article.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/content/load-article.ts#L5), [src/features/generation/article-generator.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/article-generator.ts#L226).
- The homepage, reader route, and article service all assume file-backed article loading. See [src/features/articles/article-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/articles/article-service.ts#L1), [src/app/page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/page.tsx#L16), [src/app/reader/[slug]/page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/reader/[slug]/page.tsx#L52).
- Continue reading, reader progress, saved words, and remembered items are driven from `window.localStorage` plus a browser-generated `deviceId`. See [src/components/home/continue-reading.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/home/continue-reading.tsx#L24), [src/components/reader/reader-shell.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/reader/reader-shell.tsx#L155), [src/components/words/word-list.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/words/word-list.tsx#L56), [src/lib/device-id.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/device-id.ts#L3).
- API routes for saved words and events are cookie-backed rather than database-backed. See [src/app/api/words/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/words/route.ts#L4), [src/app/api/events/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/events/route.ts#L4).
- Async generation already exists, but quota enforcement and job ownership are device-based instead of account-based. See [src/app/api/generate/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/generate/route.ts#L57), [src/features/generation/generation-job-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/generation-job-service.ts#L15).
- Environment config only models SQLite plus LLM credentials; there is no auth, mail, or deployment configuration surface yet. See [src/lib/env.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/env.ts#L3), [.env.example](/Users/pipilu/Documents/MaDun/ai-english-read/.env.example#L1), [prisma.config.ts](/Users/pipilu/Documents/MaDun/ai-english-read/prisma.config.ts#L16).

## RALPLAN-DR Summary

### Principles

1. MySQL becomes the only runtime source of truth for user state and article content.
2. Preserve the existing product surface and article object contract wherever that reduces migration risk.
3. Introduce auth before cross-device sync, because anonymous device state cannot satisfy the requirement.
4. Keep deployment single-app and reversible; avoid splitting services unless the current monolith blocks correctness.
5. Migration phases must keep the app testable at each checkpoint, even if some old local-only code remains temporarily behind adapters.

### Decision Drivers

1. Lowest-risk path to a launchable v1 on ECS Ubuntu without rewriting the app.
2. Preserve current reader/generation behavior while changing storage and identity foundations.
3. Minimize schema and UI churn where nested article content already behaves like a document.

### Viable Options

#### Option A: Monolithic Next.js + MySQL + first-party auth + document-shaped article storage

- Approach: Keep the single Next.js app, move Prisma to MySQL, add first-party email-code login with JWT/session cookies, store article top-level fields in relational columns and nested content in MySQL JSON columns.
- Pros:
  - Closest fit to the current `Article` schema and route/page structure.
  - Lowest migration cost for reader and generation paths that already operate on full article payloads.
  - Avoids multiplying tables for paragraphs/sentences that the product does not query independently today.
- Cons:
  - Article-level querying inside nested content stays limited.
  - Requires careful JSON validation at persistence boundaries.

#### Option B: Monolithic Next.js + MySQL + fully normalized article content tables

- Approach: Add separate tables for article, paragraph, sentence, vocabulary, phrase, and language-evolution substructures.
- Pros:
  - Strong relational integrity and future analytics flexibility.
  - Easier fine-grained content editing later.
- Cons:
  - Significantly larger migration surface for current loaders, page routes, seed import, and generation write path.
  - Higher risk of overbuilding for a v1 with no admin UI.

#### Option C: Split frontend and backend services during the migration

- Approach: Extract auth/content/state APIs into a separate server while keeping Next.js as frontend.
- Pros:
  - Cleaner long-term service boundaries.
  - More explicit scaling and auth separation.
- Cons:
  - Scope explosion relative to the current repo.
  - Adds deployment, networking, and integration risk without being required by the stated goals.

### Chosen Direction

Choose Option A.

### Invalidation Rationale

- Reject Option B for v1 because the current article lifecycle is document-centric, not query-centric. The existing schema and UI consume a whole `Article` payload at once, so fully normalizing nested content would spend most of the migration budget on reshaping data rather than unlocking the requested launch capabilities. See [src/lib/content/article-schema.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/content/article-schema.ts#L27), [src/app/reader/[slug]/page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/reader/[slug]/page.tsx#L52).
- Reject Option C because there is no evidence the monolith blocks correctness. The current app already serves pages and APIs from one deployable unit, and introducing a service split would add branch risk instead of reducing it. See [src/app/page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/page.tsx#L13), [src/app/api/generate/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/generate/route.ts#L57).

### Pre-mortem

1. Auth launches, but reader/client code still bootstraps from `deviceId`, so sync appears broken or duplicated.
   - Mitigation: centralize session-aware identity helpers before migrating UI consumers.
2. Content import succeeds, but generated article reads still point at filesystem JSON, so ECS instances diverge.
   - Mitigation: remove file-backed runtime loaders only after DB-backed article service is live and seeded.
3. ECS deploy succeeds, but async generation loses work on process restarts because jobs still rely on fire-and-forget in-memory execution.
   - Mitigation: keep the initial polling contract, but move job state and work-resume logic behind explicit persisted statuses; document whether v1 uses same-process workers or ECS scheduled/task workers.

### Expanded Test Plan

- Unit: schema mappers, auth token utilities, identity/session guards, article persistence adapters, generation ownership rules.
- Integration: Prisma repository tests against MySQL schema, auth API flows, words/progress/event APIs, article import and retrieval, generation-job lifecycle.
- E2E: login, cross-device sync, reader explain/save flow, continue-reading, private generated article visibility, deployment smoke path.
- Observability: migration logs, auth verification failures, generation job status transitions, ECS health checks, structured request logging for auth and generation endpoints.

## ADR

### Decision

Keep the app as a single Next.js deployment unit, migrate Prisma to MySQL, implement first-party email-code login plus JWT-backed session cookies, and store articles in MySQL using relational top-level fields plus JSON columns for nested content.

### Drivers

- The current app already behaves like a document-oriented reader product.
- Cross-device sync requires authenticated user identity.
- ECS launch scope is already large; avoid multiplying moving parts.

### Alternatives Considered

- Fully normalized article-content tables.
- Split backend service.
- Hybrid model where articles stay file-backed and only user data moves to MySQL.

### Why Chosen

This path satisfies the launch bar with the smallest behavioral delta for existing pages and tests, while still removing every current runtime dependency that is incompatible with ECS multi-instance deployment.

### Consequences

- MySQL schema will include JSON columns and application-level validation.
- Article import/export becomes a first-class repository concern.
- Auth/session infrastructure becomes foundational and must be introduced before UI sync cutover.
- Generation needs persisted job and ownership semantics, not anonymous device quota.

### Follow-ups

- Revisit full article normalization only if admin tooling or fine-grained analytics become in-scope.
- Revisit dedicated worker infrastructure if same-process async generation proves too fragile in ECS.

## Scope

### In Scope

- MySQL migration from SQLite
- ECS-compatible deployment updates for the single Next.js app
- Email verification login
- JWT-backed authenticated session cookies
- Account-bound reading progress, saved words, remembered items, and learning events
- Article content migration from filesystem JSON to MySQL
- Generated article persistence in MySQL with owner visibility
- Preservation of homepage, reader, words page, explain route, and generation polling UX

### Out of Scope

- Admin CMS or back-office tooling
- Billing, subscriptions, or entitlement logic
- Historical migration of browser-local progress/saved words
- Advanced analytics or reporting dashboards

## Implementation Plan

### Phase 1: Identity and environment foundations

Goal: establish deployable auth and MySQL runtime configuration before touching page behavior.

Work:
- Replace the SQLite datasource and adapter-only runtime in [prisma/schema.prisma](/Users/pipilu/Documents/MaDun/ai-english-read/prisma/schema.prisma#L5) and [src/lib/db.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/db.ts#L1).
- Extend env surfaces in [src/lib/env.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/env.ts#L3), [.env.example](/Users/pipilu/Documents/MaDun/ai-english-read/.env.example#L1), and [prisma.config.ts](/Users/pipilu/Documents/MaDun/ai-english-read/prisma.config.ts#L16) for MySQL, JWT secret, mail sender/provider credentials, app base URL, and cookie settings.
- Add new auth models to Prisma: `User`, `EmailVerificationCode` or equivalent verification token, `Session` or `RefreshToken` if refresh semantics are desired, plus ownership relations from user to progress, saved words, remembered items, events, and generated articles/jobs.
- Introduce auth modules and route handlers under new files such as `src/features/auth/*` and `src/app/api/auth/*`.

Acceptance criteria:
- The app boots locally against MySQL.
- Verification-code login endpoints can create and validate a login attempt.
- Session identity can be resolved server-side without `deviceId`.

### Phase 2: Article persistence migration

Goal: remove runtime dependence on filesystem article loading and writing.

Work:
- Redesign `Article` persistence so top-level list/query fields remain relational, while `paragraphs`, `growthVocabulary`, `highFrequencyPhrases`, and `languageEvolution` move into JSON columns mapped back to the existing Zod article shape in [src/lib/content/article-schema.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/content/article-schema.ts#L27).
- Replace file-backed loading in [src/lib/content/load-article.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/content/load-article.ts#L5) and [src/features/articles/article-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/articles/article-service.ts#L1) with repository-backed DB loaders.
- Upgrade [prisma/seed.ts](/Users/pipilu/Documents/MaDun/ai-english-read/prisma/seed.ts#L6) into an import script that loads all current `content/articles/*.json` into the new MySQL schema, including all nested article fields rather than only the current partial subset.
- Ensure [src/app/page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/page.tsx#L16) and [src/app/reader/[slug]/page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/reader/[slug]/page.tsx#L52) continue to receive the same `Article` shape.

Acceptance criteria:
- Homepage and reader routes can render using MySQL-backed articles only.
- The filesystem loader is no longer used by runtime routes.
- Seed/import can reconstruct current sample content in MySQL with validation.

### Phase 3: Account-bound state repositories and APIs

Goal: migrate all user state from browser-local persistence to authenticated server persistence.

Work:
- Replace anonymous `deviceId` identity in [src/lib/device-id.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/device-id.ts#L3) with session-bound user identity helpers.
- Replace progress repository logic in [src/features/reader/progress-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/reader/progress-service.ts#L1) with DB-backed read/write services keyed by `userId`.
- Replace saved words logic in [src/features/words/saved-word-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/words/saved-word-service.ts#L1) and cookie APIs in [src/app/api/words/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/words/route.ts#L31) with authenticated DB repositories and APIs.
- Move learning events from cookie-backed APIs in [src/app/api/events/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/events/route.ts#L31) to DB-backed event recording.
- Decide whether remembered items remain local-only or also become account-bound. Because cross-device continuity is part of the launch story, the preferred plan is to migrate remembered items too.

Acceptance criteria:
- No core API for progress, saved words, or events accepts raw `deviceId` as the source of truth.
- The same authenticated user can read/save on one browser and resume on another.

### Phase 4: Reader, home, and words UI cutover

Goal: switch client surfaces from local-first hydration to authenticated server sync.

Work:
- Replace `localStorage` hydration in [src/components/home/continue-reading.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/home/continue-reading.tsx#L24), [src/components/reader/reader-shell.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/reader/reader-shell.tsx#L155), and [src/components/words/word-list.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/words/word-list.tsx#L56) with authenticated fetches or server-provided bootstrap payloads.
- Add unauthenticated handling for pages that now require login to sync state, while preserving anonymous article browsing only if desired by product scope.
- Keep current UI copy and interactions stable where possible, but update any “本机” language that is no longer true.
- Ensure continue-reading chooses the latest in-progress record from server state, matching existing semantics validated by [tests/e2e/home.spec.ts](/Users/pipilu/Documents/MaDun/ai-english-read/tests/e2e/home.spec.ts#L31) and [src/features/reader/progress-service.test.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/reader/progress-service.test.ts#L40).

Acceptance criteria:
- Continue-reading, save-word, and review behavior still work with server-backed state.
- UI no longer derives identity from a browser-generated `deviceId`.

### Phase 5: Generation pipeline and article ownership

Goal: make async generation compatible with authenticated, multi-instance deployment.

Work:
- Re-key generation quotas and ownership from `deviceId` to `userId` in [src/app/api/generate/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/generate/route.ts#L57) and [src/features/generation/generation-job-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/generation-job-service.ts#L15).
- Replace local file writing in [src/features/generation/article-generator.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/article-generator.ts#L226) with article persistence through the new repository layer.
- Preserve the current async polling contract from generation POST to job-status GET in [src/app/api/generate/[jobId]/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/generate/[jobId]/route.ts#L7), but add owner checks so users can only read their own generation jobs and generated articles.
- Persist enough job metadata to recover cleanly from process restarts or failed attempts.

Acceptance criteria:
- Generated articles are queryable from MySQL and visible only to their owner.
- Daily quotas operate per authenticated user.
- Generation jobs remain observable after request/response boundaries.

### Phase 6: ECS deployment packaging and operational cutover

Goal: make the app launchable on ECS Ubuntu-backed operations without manual local assumptions.

Work:
- Add deployment artifacts such as `Dockerfile`, `.dockerignore`, and startup scripts for `prisma migrate deploy`, seed/import, and `next start`.
- Document environment variables, migration commands, and release order in README or deployment docs.
- Add health-check expectations for ECS, including app boot, DB connectivity, and LLM/env readiness.
- Keep the deployment artifact container-first so the same image can run on ECS whether the backing environment is Ubuntu EC2 hosts or an equivalent ECS runtime; host bootstrap stays outside app code.
- Decide whether async generation runs in-process in the web container for v1 or through a separate ECS task/worker. Keep the interface stable either way.

Acceptance criteria:
- A fresh environment can run migrations, import seed content, boot the app, and serve home/reader/login/words/generate routes.
- Deployment docs cover MySQL connection, auth secrets, mail config, and rollout order.

### Phase 7: Cleanup and cutover removal

Goal: remove obsolete local-first infrastructure after server-backed flows are verified.

Work:
- Delete obsolete SQLite adapter/runtime code.
- Remove dead `deviceId` consumers and cookie-only persistence paths.
- Delete filesystem runtime write paths for generated articles.
- Update tests and copy that still assert “saved to this device” behavior, for example [tests/e2e/reader-flow.spec.ts](/Users/pipilu/Documents/MaDun/ai-english-read/tests/e2e/reader-flow.spec.ts#L57).

Acceptance criteria:
- Core launch path contains no remaining production dependency on SQLite, localStorage source-of-truth, cookie-only persistence, or filesystem article writes.

## Risks and Mitigations

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Auth introduced too late | Cross-device sync and API ownership cannot be validated until identity exists | Make auth/session the first execution phase |
| Partial article import | Current seed imports only a subset of article fields | Expand import to full schema and validate every row with `articleSchema` before persistence |
| UI/server contract drift | Reader UI expects current article object shape | Keep repository output identical to the existing `Article` type during the migration |
| Async generation loss on ECS | Fire-and-forget background work is fragile under restarts | Persist job states and define restart behavior before deploy |
| Test suite still encodes local-only semantics | Existing e2e expectations mention “本机” and local resume | Update assertions only after server-backed semantics are in place and verified |

## Verification Steps

1. `pnpm lint`
2. `pnpm test`
3. `pnpm build`
4. `pnpm prisma validate`
5. MySQL integration suite against migrated repositories and auth APIs
6. Playwright coverage for login, sync, reader, words, generation, and owner visibility
7. Deployment smoke on ECS Ubuntu: migrate, seed/import, boot, health check, login, read, save, generate

## Available-Agent-Types Roster

- `architect`: boundary and schema tradeoffs
- `executor`: implementation and refactor work
- `debugger`: failure diagnosis during migration
- `verifier`: completion evidence and release-readiness checks
- `test-engineer`: test plan and coverage updates
- `security-reviewer`: auth/session/mail-token review
- `dependency-expert`: evaluate auth/mail/JWT libraries if needed
- `build-fixer`: migration/build/runtime breakage
- `writer`: deployment and migration docs
- `critic`: plan or execution review

## Follow-up Staffing Guidance

### Recommended `ralph` path

- Owner: `executor` at high reasoning
- Embedded review checkpoints:
  - `security-reviewer` at medium after auth/session implementation
  - `test-engineer` at medium after repository cutover
  - `verifier` at high before deploy readiness claim
- Best when: one primary owner should drive the migration sequentially with strong verification gates.

### Recommended `$team` path

- Lane 1: auth/session foundation
  - Role: `executor`
  - Reasoning: high
- Lane 2: MySQL schema + article/content migration
  - Role: `executor`
  - Reasoning: high
- Lane 3: UI state cutover for home/reader/words
  - Role: `executor`
  - Reasoning: medium
- Lane 4: tests + deployment docs + verification harness
  - Roles: `test-engineer` and `writer`
  - Reasoning: medium
- Shared reviews:
  - `security-reviewer` after lane 1
  - `verifier` after all lanes converge

## Launch Hints

### Ralph

```text
$ralph .omx/plans/prd-20260411T122309Z-server-mysql-migration.md
```

### Team

```text
$team .omx/plans/prd-20260411T122309Z-server-mysql-migration.md
```

If using OMX CLI directly, carry the same plan path into the team pipeline and keep team verification scoped to auth, state sync, article storage, generation ownership, and deploy readiness before shutdown.

## Team Verification Path

Team mode should prove:

1. MySQL schema and import path work end to end.
2. Authenticated session resolution works across protected APIs.
3. Reader/home/words/generate flows consume server-backed state.
4. Generated articles and jobs enforce ownership boundaries.
5. ECS deployment docs and startup commands are executable.

After team convergence, a final Ralph or verifier pass should re-run the full verification list and confirm there are no remaining runtime dependencies on local-first storage paths.

## Changelog From Review Pass

- Chose document-shaped MySQL article storage over full normalization to preserve the current article contract.
- Elevated auth/session to Phase 1 because every other sync requirement depends on it.
- Added explicit ECS async-generation risk handling instead of assuming fire-and-forget is safe in production.
