## Deep Interview Transcript Summary

- Profile: standard
- Context Type: brownfield
- Initial Ambiguity: 78%
- Final Ambiguity: 8%
- Threshold: 20%
- Context Snapshot: `.omx/context/server-mysql-migration-20260410T104623Z.md`

## Brownfield Findings

- Current app is a Next.js App Router monorepo with server pages and API routes.
- Current Prisma datasource is sqlite and runtime uses `@prisma/adapter-better-sqlite3`.
- Reader progress, saved words, and learning events are primarily local-first (`localStorage` / cookies).
- AI explanation and article generation already run on the server side and depend on server-held LLM configuration.
- Article content and generated articles are currently file-system driven, which is not suitable for production runtime persistence on ECS.

## Clarified Intent

The primary goal is to make the product formally launchable, not merely to improve developer convenience or prepare for future possibilities.

## Desired Outcome

First release should be an online product that users can register for, log into, and use across devices, with persistent reader progress and saved words tied to their account.

## In-Scope

- Server deployment on ECS
- MySQL as the primary database
- Keep Next.js as a single repo / single application architecture
- Email verification login
- JWT-based auth
- Full database-backed persistence
- Article list and reader main flow
- Saved words
- AI selection explanation
- Online article generation
- Cross-device sync for user progress and saved words
- Generated articles visible only to the generating user

## Out-of-Scope / Non-goals

- Admin backend
- Payments / subscriptions
- Admin review workflow for generated content
- Complex analytics dashboards
- Legacy local data migration
- Additional non-functional hardening requirements beyond basic launchability

## Decision Boundaries

The downstream planner/executor may decide without further confirmation:

- Migrate article content, reading progress, saved words, and generation jobs into MySQL
- Keep the monolithic Next.js deployment shape instead of splitting frontend/backend
- Use the minimal viable email-verification login system
- Use JWT for authentication
- Make article generation a server-side asynchronous polling workflow
- Operate without an admin panel in v1, using seed/scripts/SQL for content operations

## Pressure Pass

The initial phrase "formally launchable" was pressure-tested against concrete acceptance criteria. This surfaced that cross-device sync and auth are not optional future enhancements; they are part of the launch bar.

## Round-by-Round Condensed Transcript

### Round 1
- Target: Intent
- Question: If only one core problem could be solved first by this migration, what matters most?
- Answer: Formal launchability.

### Round 2
- Target: Outcome
- Question: Which current capabilities are mandatory for a launchable first version?
- Answer: Article list and reader flow, saved words, AI selection explanation, online article generation.

### Round 3
- Target: Scope
- Question: What is explicitly out of scope?
- Answer: Admin backend, payments/subscriptions, admin review of generated content, complex analytics dashboards.

### Round 4
- Target: Scope
- Question: Are login/account system and cross-device sync needed in v1?
- Answer: Both are required.

### Round 5
- Target: Decision Boundaries
- Question: Which technical decisions may be made by default?
- Answer: All proposed defaults are accepted.

### Round 6
- Target: Success Criteria
- Question: What proves the migration succeeded?
- Answer: Users can register/login, see their progress and saved words on another device, and core pages are stable after deployment.

### Final Clarifications
- Email verification
- JWT
- Fully database-backed content/storage
- No legacy data migration
- Generated content visible only to its owner
- Target environment is ECS
- No explicit backup/monitoring/rate-limit requirements for v1
