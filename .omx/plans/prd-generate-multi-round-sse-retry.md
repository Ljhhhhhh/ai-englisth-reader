# PRD: Multi-Round Generation With SSE And Same-Job Retry

## Metadata

- Source requirement: `/Users/pipilu/Documents/MaDun/lexora/.omx/specs/deep-interview-generation-multi-round-pipeline.md`
- Planning mode: `ralplan`
- Consensus status: `APPROVED`
- Context snapshot: `/Users/pipilu/Documents/MaDun/lexora/.omx/context/generation-multi-round-pipeline-20260413T134215Z.md`
- Interview transcript: `/Users/pipilu/Documents/MaDun/lexora/.omx/interviews/generation-multi-round-pipeline-20260413T134215Z.md`

## Goal

Replace the current single-shot article generation flow with a durable brownfield pipeline that:

1. synchronously extracts and persists canonical input before returning `202`
2. runs four resumable LLM stages plus an idempotent `finalize` step
3. streams durable job snapshots to the frontend over `SSE`
4. preserves completed stage outputs when a later stage fails
5. retries on the same `GenerationJob` without consuming quota again

## Principles

1. Persist canonical input before any resumable LLM work starts.
2. Make job progress claim-safe and revisioned so retries and concurrent resumes cannot corrupt state.
3. Keep v1 brownfield and reversible: extend the current job/article path, no blob store, no sweeper.
4. Publish user-visible progress only from durable snapshots, not transient in-memory events.
5. Make finalize idempotent and deterministic via reserved slug upsert.

## Decision Drivers

1. Durable file/url recovery without raw upload storage in v1.
2. Explicit resume/claim semantics for same-job retry under crashes or duplicate triggers.
3. Proof for restart/retry behavior and SSE monotonicity.
4. Preserve quota semantics: one user intent creates one billed job, retries are free.

## Chosen Option

Use a brownfield hybrid flow:

- `POST /api/generate` authenticates, checks quota once, synchronously runs `extractContent(...)`, reserves a stable slug, persists canonical input on `GenerationJob`, returns `202`, then asynchronously queues `startOrResume(jobId)`.
- The resumable pipeline starts only after canonical input exists on the job.
- `GET /api/generate/[jobId]` and the SSE route are read-only projections of persisted state.
- Retry operates on the same job only, never creates a new job, and never burns quota again.

### Alternatives Rejected

- Fully async extraction after `202`
  - rejected because file recovery becomes non-durable without a raw-upload store
- Durable raw upload/blob store in v1
  - rejected as unnecessary scope for the locked requirements
- New job per retry
  - rejected because it breaks quota semantics and resume lineage
- Background stale-claim sweeper in v1
  - rejected as extra runtime complexity; explicit retry reclaim is sufficient
- Transient event-style SSE
  - rejected because reconnect/restart correctness requires durable monotonic snapshots

## User-Facing Flow

1. User submits URL or file on `/generate`.
2. Server extracts canonical text synchronously and creates a job with reserved slug.
3. Client receives `202` and opens SSE for the job.
4. Each completed stage immediately appears as a full preview block on the generate page.
5. If a stage fails, prior previews remain visible and the user can retry the same job.
6. After `finalize`, the published `articleSlug` appears and the reader CTA becomes available.

## Data Model

Extend `GenerationJob` to hold:

- canonical input:
  - `canonicalSource`
  - `canonicalTitleHint`
  - `canonicalText`
- publication identity:
  - `reservedArticleSlug`
  - `articleSlug`
- orchestration state:
  - `status`
  - `currentStep`
  - `stagesJson`
  - `lastErrorJson`
  - `retryable`
- concurrency state:
  - `revision`
  - `claimToken`
  - `claimedBy`
  - `claimedUntil`
  - `activeAttempt`

`stagesJson` is the v1 source of truth for per-stage outputs and statuses because the stage count is fixed.

## Trigger Model

### Create

- `POST /api/generate`
  - validates auth
  - checks daily quota once
  - synchronously extracts content for `url` or `file`
  - reserves a stable slug from canonical input plus job id suffix
  - persists canonical input and empty orchestration state
  - returns `202`
  - triggers `startOrResume(jobId)` asynchronously

### Retry

- `POST /api/generate/[jobId]/retry`
  - validates auth and ownership
  - only resumes when the job is retryable or has a stale claim
  - calls `startOrResume(jobId)`
  - never creates another job
  - never decrements remaining quota

### Read Paths

- `GET /api/generate/[jobId]`
  - returns current durable snapshot
  - never starts work
- `GET /api/generate/[jobId]/events`
  - streams durable snapshots
  - never starts work

## Claim And Revision Contract

`startOrResume(jobId)` must:

1. acquire ownership only when claim is absent or expired
2. set `claimToken`, `claimedBy`, `claimedUntil`, `activeAttempt`
3. renew the lease before each durable step write
4. require every write to match `claimToken` and expected `revision`
5. atomically increment `revision` on each successful write
6. clear claim fields on terminal success or terminal failure

Stale claims are reclaimable only through explicit retry in v1.

## Stage Contract

| Stage | Produced Fields | Persisted Snapshot Key | Preview Visibility | Final Assembly Mapping |
| --- | --- | --- | --- | --- |
| `english` | `feynman_summary` | `job.stages.english` | User-visible after persistence | `Article.feynman_summary` |
| `vocabulary` | `growth_vocabulary`, `high_frequency_phrases` | `job.stages.vocabulary` | User-visible after persistence | `Article.growth_vocabulary`, `Article.high_frequency_phrases` |
| `grammar` | `language_evolution` | `job.stages.grammar` | User-visible after persistence | `Article.language_evolution` |
| `translation` | `chinese_title`, `list_summary_zh`, `chinese_translation`, `paragraph_translations` | `job.stages.translation` | User-visible after persistence | `Article.chinese_title`, `Article.list_summary_zh`, `Article.chinese_translation`, paragraph translations |
| `finalize` | `slug` (reserved), `title` (`canonicalTitleHint`), `source`, `difficulty`, `estimatedMinutes`, `paragraphs` | `job.stages.finalize` | Terminal published result | Final `Article` assembly and persistence |

## Finalize Contract

`finalize` is a non-LLM step and must be independently retryable.

Responsibilities:

- parse `feynman_summary` into `paragraphs`
- align `paragraph_translations` to parsed paragraphs
- preserve the current paragraph assembly behavior from `src/features/generation/article-generator.ts`
- set:
  - `slug = reservedArticleSlug`
  - `title = canonicalTitleHint`
  - `source = canonicalSource`
  - `difficulty`
  - `estimatedMinutes`
- assemble the complete `Article`
- upsert through `upsertPersistedArticle(...)` using the reserved slug
- publish `articleSlug` only after finalize succeeds

Idempotence rule:

- repeated finalize attempts for the same job converge to one article row and one published `articleSlug`

## Consumer Compatibility

The finalized article must still satisfy `src/lib/content/article-schema.ts` and remain consumable by current surfaces:

- home page uses `chinese_title` and `list_summary_zh`
- reader intro uses `language_evolution`
- article repository mapper pair must round-trip the finalized article without adapter-only field renames

## Delivery Phases

### Phase 1: Schema And Snapshot Foundation

Touchpoints:

- `prisma/schema.prisma`
- `src/features/generation/generation-job-service.ts`
- `src/app/api/generate/[jobId]/route.ts`

Deliverables:

- expanded `GenerationJob` schema
- typed snapshot schema
- service methods for creation, claiming, stage writes, retryability, and terminal publication

### Phase 2: Create / Retry / Orchestrator

Touchpoints:

- `src/app/api/generate/route.ts`
- `src/app/api/generate/[jobId]/retry/route.ts`
- new orchestrator module under `src/features/generation/`

Deliverables:

- synchronous extraction on create
- same-job retry route
- `startOrResume(jobId)` with claim/revision enforcement

### Phase 3: Multi-Stage Generator And Finalize

Touchpoints:

- `src/features/generation/article-generator.ts`
- `src/features/generation/prompt-output-schema.ts`
- new stage modules under `src/features/generation/stages/`
- `src/features/articles/article-repository.ts`

Deliverables:

- stage-specific schemas and prompts
- stage output persistence
- finalize assembly and idempotent upsert

### Phase 4: SSE And Generate UI

Touchpoints:

- `src/app/api/generate/[jobId]/events/route.ts`
- `src/components/generate/generate-page-client.tsx`
- optional new presentational components under `src/components/generate/`

Deliverables:

- revisioned snapshot SSE
- stage preview UI
- same-job retry CTA
- terminal reader CTA

## ADR

### Decision

Adopt a brownfield hybrid resumable pipeline:

- synchronous extraction plus canonical-input persistence in `POST /api/generate`
- asynchronous same-job `startOrResume(jobId)` orchestration
- revisioned claim/lease semantics
- idempotent finalize-by-reserved-slug
- read-only snapshot + SSE projection

### Why Chosen

This is the smallest plan that satisfies all locked requirements:

- durable retries
- same-job resume
- no second quota burn
- SSE reconnect safety
- final article compatibility with existing readers

### Consequences

- `POST /api/generate` becomes heavier
- `GenerationJob` becomes the execution and UI source of truth
- stale claims require explicit retry in v1

### Follow-Ups

- re-evaluate blob/raw-upload durability if extraction latency becomes a problem
- consider background stale-claim reclamation after v1
- consider richer SSE resume cursors if snapshot payloads grow materially
