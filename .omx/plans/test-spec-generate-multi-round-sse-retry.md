# Test Spec: Multi-Round Generation With SSE And Same-Job Retry

## Goal

Prove that the new generation pipeline is:

- durable across retries and process death
- safe under duplicate start/retry attempts
- monotonic for SSE clients
- backward-compatible with current article consumers

## Verification Levels

- Unit
- Route / integration
- Concurrency / recovery
- UI / component
- Consumer compatibility

## Unit Coverage

### Generation Job Service

Touchpoints:

- `src/features/generation/generation-job-service.test.ts`

Assertions:

1. job creation persists:
   - `canonicalSource`
   - `canonicalTitleHint`
   - `canonicalText`
   - `reservedArticleSlug`
   - `revision = 0`
2. claim acquisition succeeds only when claim is absent or expired
3. writes with wrong `claimToken` fail
4. writes with stale `revision` fail
5. successful step writes increment `revision` by exactly `1`
6. lease renewal extends `claimedUntil`
7. terminal success clears claim fields
8. terminal failure clears claim fields and preserves completed stages
9. retry planner skips completed stages and resumes the first incomplete/failed stage only

### Stage Modules

Touchpoints:

- new tests under `src/features/generation/stages/`

Assertions:

1. `english` accepts canonical input and returns only `feynman_summary`
2. `vocabulary` derives `growth_vocabulary` and `high_frequency_phrases` from persisted english output
3. `grammar` returns `language_evolution`
4. `translation` returns:
   - `chinese_title`
   - `list_summary_zh`
   - `chinese_translation`
   - `paragraph_translations`

### Finalize

Touchpoints:

- new tests under `src/features/generation/`

Assertions:

1. finalize preserves current paragraph assembly behavior from `article-generator.ts`
2. finalize computes one canonical `Article`
3. repeated finalize runs upsert by reserved slug and do not create duplicate articles
4. finalize replay after a partial crash converges to one article row and one published `articleSlug`

## Route / Integration Coverage

### Create Route

Touchpoints:

- `src/app/api/generate/route.test.ts`

Assertions:

1. `POST /api/generate` extracts url/file content before returning `202`
2. canonical input is stored on the job before async resume starts
3. remaining quota is decremented only on initial create
4. async resume is queued after `202`

### Retry Route

Touchpoints:

- `src/app/api/generate/[jobId]/retry/route.test.ts`

Assertions:

1. retry never creates another job
2. retry never decrements quota
3. retry rejects jobs that are neither retryable nor stale-claimed
4. retry resumes the same job from the first incomplete/failed stage

### Snapshot Route

Touchpoints:

- `src/app/api/generate/[jobId]/route.test.ts`

Assertions:

1. snapshot route never starts work
2. pre-finalize snapshots omit published `articleSlug`
3. terminal success snapshot includes published `articleSlug`
4. terminal failure snapshot preserves completed stage outputs

### SSE Route

Touchpoints:

- `src/app/api/generate/[jobId]/events/route.test.ts`

Assertions:

1. connect returns an initial full snapshot immediately
2. later snapshots are strictly monotonic by `revision`
3. reconnect after observing revision `n` yields state `>= n`
4. no event represents non-durable state
5. terminal success/failure snapshots close the stream lifecycle cleanly

## Concurrency And Recovery Coverage

Assertions:

1. two concurrent `startOrResume(jobId)` calls yield exactly one active claimant
2. a crashed worker with expired claim can be reclaimed by explicit retry
3. stale claimant writes fail after another claimant advances the revision
4. file-input retry after simulated process death resumes from persisted canonical text, not the original upload
5. finalize retry after crash between article upsert and job mark-done converges to one article and one done snapshot

## UI / Component Coverage

Touchpoints:

- `src/app/generate/page.test.tsx`
- `src/components/generate/generate-page-client.tsx`
- optional new component tests under `src/components/generate/`

Assertions:

1. stage previews appear incrementally from SSE snapshots
2. reconnect preserves the latest visible completed stages
3. retry button targets the same job
4. prior completed previews remain visible after a later-stage failure
5. reader CTA appears only after terminal success snapshot includes published `articleSlug`

## Consumer Compatibility Coverage

### Repository Round-Trip

Touchpoints:

- `src/features/articles/article-repository.test.ts`

Assertions:

1. finalized article persists through `mapArticleToPersistenceInput`
2. replay through `mapArticleRecordToArticle` returns the same runtime article shape
3. replay preserves:
   - `chinese_title`
   - `list_summary_zh`
   - `language_evolution`

### Home Surface

Touchpoints:

- `src/app/page.tsx`

Assertions:

1. finalized/replayed article still provides homepage title via `chinese_title`
2. finalized/replayed article still provides card preview text via `list_summary_zh`

### Reader Intro Surface

Touchpoints:

- `src/components/reader/intro-panel.tsx`

Assertions:

1. finalized/replayed article still renders the grammar card from `language_evolution`
2. no adapter-only field translation is required at the consumer boundary

## Acceptance Gate

The plan is executable only if all of the following are provable:

1. same-job retry preserves prior successful stages
2. quota is charged once per created job, never on retry
3. SSE snapshots are durable and monotonic
4. finalize is idempotent
5. finalized articles still satisfy the current repository and UI consumers

## Residual Risks To Watch During Execution

1. synchronous extraction may increase `POST /api/generate` latency
2. large job snapshots may make SSE payloads heavier than expected
3. lease timeout tuning may need iteration once real stage durations are observed
