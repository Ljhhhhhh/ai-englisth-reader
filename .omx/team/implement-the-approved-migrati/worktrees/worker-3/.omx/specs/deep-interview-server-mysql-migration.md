## Metadata

- Profile: standard
- Rounds: 4
- Final Ambiguity: 6%
- Threshold: 20%
- Context Type: brownfield
- Context Snapshot: [server-mysql-migration-20260411T121443Z.md](/Users/pipilu/Documents/MaDun/ai-english-read/.omx/context/server-mysql-migration-20260411T121443Z.md)
- Interview Transcript: [server-mysql-migration-20260411T122309Z.md](/Users/pipilu/Documents/MaDun/ai-english-read/.omx/interviews/server-mysql-migration-20260411T122309Z.md)

## Clarity Breakdown

| Dimension | Score |
| --- | --- |
| Intent | 0.95 |
| Outcome | 0.95 |
| Scope | 0.95 |
| Constraints | 0.92 |
| Success | 0.92 |
| Context | 0.95 |

## Intent

Upgrade the current local-first MVP into a formally launchable online product that can be deployed on ECS Ubuntu servers and used reliably by authenticated users across devices.

## Desired Outcome

Deliver a production-deployable v1 where:

- Users can register and log in via email verification
- Authenticated users can access the article list and reader flow
- Reader progress and saved words are tied to the user account and visible on another device
- AI selection explanation works through the server
- Online article generation works through the server
- Core pages are stably accessible after ECS deployment

## In-Scope

- Deploy the existing Next.js application to ECS
- Replace sqlite with MySQL
- Remove sqlite-specific runtime adapter usage
- Introduce JWT-based auth with email verification
- Move article storage to MySQL
- Move reading progress to MySQL
- Move saved words to MySQL
- Move generation jobs to MySQL
- Support generated-article ownership and per-user visibility
- Preserve article list and reader main flow
- Preserve saved words
- Preserve AI selection explanation
- Preserve online article generation
- Support cross-device synchronization for progress and saved words

## Out-of-Scope / Non-goals

- Admin backend
- Payments / subscriptions
- Admin review of generated content
- Complex analytics/reporting dashboards
- Migration/import of old localStorage or cookie data
- Additional production hardening requirements beyond baseline launchability

## Decision Boundaries

Downstream planning/execution may decide these without re-asking:

- Keep the app as a single Next.js codebase and deployment unit
- Use email verification as the authentication method
- Use JWT as the auth/session mechanism
- Make all operational data fully database-backed
- Make generated articles visible only to the generating user
- Implement article generation as an async server-side job with client polling
- Use scripts/seed/manual SQL instead of building an admin panel

## Constraints

- Target deployment environment is ECS
- Target server environment is Ubuntu
- Database must be MySQL
- No requirement to preserve existing browser-local data
- No requirement to add admin operations UI
- No requirement to add payments
- No requirement to add advanced analytics
- No requirement to satisfy explicit backup/monitoring/rate-limit SLOs in v1

## Testable Acceptance Criteria

- A new user can complete email verification and obtain an authenticated session
- An authenticated user can sign in on device A, create progress/saved-word data, then sign in on device B and see the same data
- Article list page renders correctly in the deployed environment
- Reader page renders correctly in the deployed environment
- Saved words page works for authenticated users against server-backed persistence
- AI selection explanation returns results for authenticated users
- Online article generation can be submitted, processed asynchronously, and the resulting article is visible only to the generating user
- No core user path depends on browser localStorage or cookie-only persistence as the source of truth

## Assumptions Exposed + Resolutions

- Assumption: “Launchable” might mean only deployable infrastructure.
  Resolution: Rejected. Launchability includes auth and cross-device sync.
- Assumption: Local-first persistence could remain acceptable for v1.
  Resolution: Rejected. Progress and saved words must sync across devices.
- Assumption: Generated content could stay file-system based.
  Resolution: Rejected. Storage is fully database-backed and per-user visible.

## Pressure-Pass Findings

The phrase “正式上线可用” was initially underspecified. Pressure-testing on success criteria showed that launchability requires not only deployment but also user auth, synchronized account-bound data, and service-backed article storage. That materially changes schema, API, and storage scope.

## Brownfield Evidence vs Inference

Evidence:
- sqlite datasource exists in `prisma/schema.prisma`
- sqlite adapter exists in `src/lib/db.ts`
- local persistence exists in reader progress / saved words / events services
- cookie-backed APIs exist for words/events
- file-backed article loading and writing exist
- server-based AI routes already exist

Inference:
- ECS Ubuntu multi-instance deployment makes file-backed generated article persistence an unsuitable primary storage model
- JWT + email verification can be integrated without splitting frontend/backend, given current monolithic Next.js structure

## Technical Context Findings

### Current schema/runtime issues to address

- [prisma/schema.prisma](/Users/pipilu/Documents/MaDun/ai-english-read/prisma/schema.prisma)
- [prisma.config.ts](/Users/pipilu/Documents/MaDun/ai-english-read/prisma.config.ts)
- [src/lib/db.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/db.ts)

### Current local-first persistence to replace

- [src/features/reader/progress-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/reader/progress-service.ts)
- [src/features/words/saved-word-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/words/saved-word-service.ts)
- [src/features/analytics/event-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/analytics/event-service.ts)
- [src/app/api/words/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/words/route.ts)
- [src/app/api/events/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/events/route.ts)

### Current file-backed article flow to replace

- [src/lib/content/load-article.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/content/load-article.ts)
- [src/features/articles/article-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/articles/article-service.ts)
- [src/features/generation/article-generator.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/article-generator.ts)

### Current server capabilities to preserve and adapt

- [src/app/api/reader/explain/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/reader/explain/route.ts)
- [src/features/reader/reader-explain-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/reader/reader-explain-service.ts)
- [src/app/api/generate/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/generate/route.ts)
- [src/app/api/generate/[jobId]/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/generate/[jobId]/route.ts)
- [src/features/generation/generation-job-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/generation-job-service.ts)

## Execution-Ready Refactor Checklist Skeleton

### Phase 1: Data and auth foundations

- Add user/account/auth-related Prisma models for email verification + JWT support
- Replace sqlite datasource with MySQL datasource
- Remove `@prisma/adapter-better-sqlite3` runtime usage
- Define article ownership / visibility model for generated content
- Plan seed strategy for initial article import from existing JSON

### Phase 2: Article storage migration

- Migrate article reads from file-backed loading to MySQL queries
- Import existing `content/articles/*.json` into database
- Update article list and article detail loaders to read from DB
- Remove runtime dependence on writing generated article JSON files

### Phase 3: User-bound persistence migration

- Replace progress localStorage source of truth with authenticated DB persistence
- Replace saved words localStorage/cookie source of truth with authenticated DB persistence
- Decide whether learning events remain optional/local or move to DB as secondary scope
- Update UI data flow so cross-device state comes from the server

### Phase 4: Generation and explain flows

- Keep AI explanation server-side and make it auth-aware where needed
- Keep generation as async job + polling
- Persist generation jobs in MySQL
- Persist generated articles in MySQL with owner visibility rules
- Ensure generated articles are only visible to the generating user

### Phase 5: Deployment readiness

- Add ECS-oriented environment configuration for Next.js + MySQL + LLM env vars
- Define build/start/migration/seed commands for ECS deployment
- Verify deployed access for home, reader, login, saved words, and generation flows

### Phase 6: Verification

- Auth flow test: email verification -> login -> authenticated access
- Sync test: create progress/saved words on one device, verify visibility on another
- Reader test: core article list + reader path on deployed environment
- AI test: selection explanation works
- Generation test: submit job, poll completion, open generated private article

## Recommended Handoff

Recommended next step: `$ralplan`

Suggested invocation:

```text
$plan --consensus --direct .omx/specs/deep-interview-server-mysql-migration-20260411.md
```

Alternative handoffs:

- `$autopilot` when you want to go straight into planning/execution from this spec
- `$ralph` when you want one persistent owner to execute against this spec
- `$team` when you expect parallel work lanes across auth, data, and deployment
