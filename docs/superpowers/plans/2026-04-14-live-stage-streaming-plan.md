# Live Stage Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stream each generation stage to the generate page while the model is still producing text, instead of waiting for the full stage result to persist before rendering.

**Architecture:** Keep `GenerationJob` and `stagesJson` as the durable source of truth for completed stage outputs, but add an in-memory live draft channel keyed by `jobId + stage` for transient chunk updates. The pipeline emits chunk events during model generation, the SSE route multiplexes durable snapshots with live draft events, and the frontend renders draft content immediately while still reconciling against durable stage snapshots when a round completes.

**Tech Stack:** Next.js App Router, SSE (`EventSource`), LangChain `ChatOpenAI`, Prisma, Vitest, React 19.

---

## File Map

**Create:**
- `src/features/generation/live-stage-store.ts`
- `src/features/generation/live-stage-schema.ts`
- `src/features/generation/live-stage-store.test.ts`
- `src/features/generation/stages/streaming-stage-render.ts`
- `src/features/generation/stages/streaming-stage-render.test.ts`
- `src/app/api/generate/[jobId]/events/route.test.ts`

**Modify:**
- `src/features/generation/stages/shared.ts`
- `src/features/generation/stages/generate-english-stage.ts`
- `src/features/generation/stages/generate-vocabulary-stage.ts`
- `src/features/generation/stages/generate-grammar-stage.ts`
- `src/features/generation/stages/generate-translation-stage.ts`
- `src/features/generation/generation-pipeline-runner.ts`
- `src/app/api/generate/[jobId]/events/route.ts`
- `src/components/generate/generate-page-client.tsx`
- `src/components/generate/generate-stage-preview.tsx`
- `src/app/generate/page.test.tsx`

**Verify Existing Compatibility:**
- `src/features/generation/generation-pipeline-runner.test.ts`
- `src/features/generation/stages/build-final-article.test.ts`
- `src/features/generation/generation-job-service.test.ts`

## Architecture Notes

1. Durable data remains unchanged:
   - `stagesJson` keeps only completed/failed stage outputs
   - retries still resume from the first incomplete or failed stage
   - final reader entry still depends on the durable `articleSlug`
2. Live drafts are explicitly transient:
   - stored in process memory only
   - cleared when a stage succeeds, fails, or the job reaches terminal state
   - never treated as source of truth for resume/retry
3. Stage execution splits into two output modes:
   - live text chunks for immediate user rendering
   - final structured payload for stage persistence and finalize
4. SSE becomes a dual-channel stream:
   - `snapshot` for durable job state
   - `stage_draft` for currently streaming stage content

## Event Contract

### Durable Event

`event: snapshot`

Payload:

```ts
{
  id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  revision: number;
  currentStep: GenerationStageName | null;
  retryable: boolean;
  articleSlug: string | null;
  lastError: { message: string; stage?: GenerationStageName } | null;
  stages: Record<GenerationStageName, GenerationStageRecord>;
  llmDebug?: LlmDebugRecord | null;
}
```

### Live Draft Event

`event: stage_draft`

Payload:

```ts
{
  jobId: string;
  stage: GenerationStageName;
  attempt: number;
  status: 'streaming' | 'completed' | 'cleared';
  text: string;
  updatedAt: string;
}
```

Rules:
- `streaming`: emitted as text accumulates
- `completed`: emitted once right before durable stage success snapshot lands
- `cleared`: emitted when a draft should be removed because the stage failed, restarted, or terminal reconciliation replaced it

## Task 1: Define live draft schema and store

**Files:**
- Create: `src/features/generation/live-stage-schema.ts`
- Create: `src/features/generation/live-stage-store.ts`
- Test: `src/features/generation/live-stage-store.test.ts`

- [ ] **Step 1: Write the failing store test**

Cover:
- set/get draft by `jobId + stage`
- monotonic replacement within same attempt
- clear one stage
- clear all stages for a job
- expired entries cleanup

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
zsh -lc 'npm exec vitest run src/features/generation/live-stage-store.test.ts'
```

Expected: FAIL because the store files do not exist.

- [ ] **Step 3: Implement minimal live draft schema**

Define:
- `LiveStageDraftStatus`
- `LiveStageDraft`
- parser helpers for store payloads

- [ ] **Step 4: Implement minimal in-memory store**

Functions:
- `setLiveStageDraft`
- `getLiveStageDraft`
- `listLiveStageDraftsForJob`
- `clearLiveStageDraft`
- `clearLiveStageDraftsForJob`

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
zsh -lc 'npm exec vitest run src/features/generation/live-stage-store.test.ts'
```

- [ ] **Step 6: Commit**

```bash
git add src/features/generation/live-stage-schema.ts src/features/generation/live-stage-store.ts src/features/generation/live-stage-store.test.ts
git commit -m "Enable transient live stage draft storage"
```

## Task 2: Add a streaming render helper per stage

**Files:**
- Create: `src/features/generation/stages/streaming-stage-render.ts`
- Create: `src/features/generation/stages/streaming-stage-render.test.ts`

- [ ] **Step 1: Write the failing renderer tests**

Cover:
- english draft renders raw article text
- vocabulary draft renders text blocks or bullet-ish fragments
- grammar draft renders prose as it grows
- translation draft renders partial title/body text

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
zsh -lc 'npm exec vitest run src/features/generation/stages/streaming-stage-render.test.ts'
```

- [ ] **Step 3: Implement minimal render helper**

Expose one function:

```ts
renderStreamingStageDraft(stage, rawText): string
```

Purpose:
- normalize whitespace
- preserve readable line breaks
- avoid pretending incomplete JSON is final parsed data

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
zsh -lc 'npm exec vitest run src/features/generation/stages/streaming-stage-render.test.ts'
```

- [ ] **Step 5: Commit**

```bash
git add src/features/generation/stages/streaming-stage-render.ts src/features/generation/stages/streaming-stage-render.test.ts
git commit -m "Add stage draft rendering helpers"
```

## Task 3: Stream model output from the shared stage executor

**Files:**
- Modify: `src/features/generation/stages/shared.ts`
- Modify: `src/features/generation/stages/generate-english-stage.ts`
- Modify: `src/features/generation/stages/generate-vocabulary-stage.ts`
- Modify: `src/features/generation/stages/generate-grammar-stage.ts`
- Modify: `src/features/generation/stages/generate-translation-stage.ts`

- [ ] **Step 1: Write a failing shared-stage test or extend existing stage tests**

Cover:
- stage helper can emit chunk callbacks during model output
- final parsed output still returns structured payload
- retry preserves attempt number in callback

- [ ] **Step 2: Run test to verify it fails**

Run only the new/extended tests.

- [ ] **Step 3: Refactor `invokeGenerationStage` to support chunk callbacks**

Add options:

```ts
onTextChunk?: (input: { attempt: number; chunk: string; accumulatedText: string }) => void
onAttemptBoundary?: (input: { attempt: number; stage: string; status: 'started' | 'retrying' }) => void
```

Implementation notes:
- use `llm.stream(...)` for draft capture
- accumulate raw text locally
- still perform structured parsing before returning final result
- if the SDK does not support `withStructuredOutput(...).stream(...)` cleanly, split generation into:
  - raw streamed text response
  - final parse step from accumulated text

- [ ] **Step 4: Update each stage module to pass stage metadata**

Keep their stage-specific prompts and schemas intact, but allow live chunk forwarding.

- [ ] **Step 5: Run targeted tests to verify pass**

Run:

```bash
zsh -lc 'npm exec vitest run src/features/generation/generation-pipeline-runner.test.ts src/features/generation/stages/build-final-article.test.ts'
```

- [ ] **Step 6: Commit**

```bash
git add src/features/generation/stages/shared.ts src/features/generation/stages/generate-english-stage.ts src/features/generation/stages/generate-vocabulary-stage.ts src/features/generation/stages/generate-grammar-stage.ts src/features/generation/stages/generate-translation-stage.ts
git commit -m "Stream text chunks during generation stages"
```

## Task 4: Publish live drafts from the pipeline runner

**Files:**
- Modify: `src/features/generation/generation-pipeline-runner.ts`
- Modify: `src/features/generation/generation-pipeline-runner.test.ts`
- Modify: `src/features/generation/live-stage-store.ts`

- [ ] **Step 1: Write the failing runner test**

Add assertions:
- english stage writes streaming draft before durable success
- grammar stage writes draft chunks while running
- stage success clears live draft or marks it completed
- stage failure clears or resets the active draft before retry

- [ ] **Step 2: Run runner test to verify it fails**

Run:

```bash
zsh -lc 'npm exec vitest run src/features/generation/generation-pipeline-runner.test.ts'
```

- [ ] **Step 3: Wire pipeline runner to store live drafts**

For each stage:
- clear stale draft on stage start
- update live draft on every chunk
- mark draft completed immediately before durable stage success
- clear draft after durable snapshot is enough for UI reconciliation

- [ ] **Step 4: Preserve retry semantics**

Rules:
- never persist draft-only content to `stagesJson`
- retries start from durable incomplete stage, not draft state
- failed attempt draft is cleared before reattempt

- [ ] **Step 5: Run runner test again**

Run:

```bash
zsh -lc 'npm exec vitest run src/features/generation/generation-pipeline-runner.test.ts'
```

- [ ] **Step 6: Commit**

```bash
git add src/features/generation/generation-pipeline-runner.ts src/features/generation/generation-pipeline-runner.test.ts src/features/generation/live-stage-store.ts
git commit -m "Publish live drafts from generation pipeline"
```

## Task 5: Extend the SSE route to emit live draft events

**Files:**
- Modify: `src/app/api/generate/[jobId]/events/route.ts`
- Create: `src/app/api/generate/[jobId]/events/route.test.ts`

- [ ] **Step 1: Write the failing SSE route test**

Cover:
- initial connection sends `snapshot`
- while a stage draft exists, route emits `stage_draft`
- durable snapshots remain monotonic by revision
- terminal job closes cleanly after final snapshot

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
zsh -lc 'npm exec vitest run "src/app/api/generate/[jobId]/events/route.test.ts"'
```

- [ ] **Step 3: Implement dual-channel SSE**

Route behavior:
- keep existing initial durable `snapshot`
- poll durable job snapshot as before
- also poll live draft store for the active job
- emit `stage_draft` only when content changed since last emission
- de-duplicate by `updatedAt + text length`

- [ ] **Step 4: Keep stream lifecycle stable**

Rules:
- live draft events never replace durable snapshot events
- terminal `done`/`failed` still closes
- heartbeat stays intact

- [ ] **Step 5: Run SSE route test to verify pass**

Run:

```bash
zsh -lc 'npm exec vitest run "src/app/api/generate/[jobId]/events/route.test.ts"'
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/generate/[jobId]/events/route.ts src/app/api/generate/[jobId]/events/route.test.ts
git commit -m "Stream live stage draft events over SSE"
```

## Task 6: Render live drafts on the generate page

**Files:**
- Modify: `src/components/generate/generate-page-client.tsx`
- Modify: `src/components/generate/generate-stage-preview.tsx`
- Modify: `src/app/generate/page.test.tsx`

- [ ] **Step 1: Write the failing page test**

Add assertions:
- english draft text appears before the stage succeeds
- grammar draft text updates incrementally while `status=processing`
- durable snapshot replaces draft with final structured preview once complete
- retry clears stale live draft and starts rendering the new attempt

- [ ] **Step 2: Run page test to verify it fails**

Run:

```bash
zsh -lc 'npm exec vitest run src/app/generate/page.test.tsx'
```

- [ ] **Step 3: Extend client state for live drafts**

State shape:

```ts
type LiveDraftMap = Partial<Record<GenerationStageName, {
  attempt: number;
  status: 'streaming' | 'completed';
  text: string;
  updatedAt: string;
}>>
```

Consume:
- `snapshot`
- `stage_draft`

Render rules:
- if a stage is running and a live draft exists, show it immediately
- once durable `stage.data` exists, prefer durable preview
- if a draft is cleared, remove it from UI

- [ ] **Step 4: Update preview component**

Support a second mode:
- durable preview from parsed stage data
- live draft preview from plain text

Do not pretend incomplete draft text is final structured vocabulary/grammar data; label it as “实时生成中”.

- [ ] **Step 5: Run page test to verify pass**

Run:

```bash
zsh -lc 'npm exec vitest run src/app/generate/page.test.tsx'
```

- [ ] **Step 6: Commit**

```bash
git add src/components/generate/generate-page-client.tsx src/components/generate/generate-stage-preview.tsx src/app/generate/page.test.tsx
git commit -m "Render live generation drafts on the generate page"
```

## Task 7: Full regression verification

**Files:**
- Verify only

- [ ] **Step 1: Run targeted generation suite**

```bash
zsh -lc 'npm exec vitest run src/features/generation/generation-job-service.test.ts src/features/generation/generation-pipeline-runner.test.ts src/features/generation/stages/build-final-article.test.ts "src/app/api/generate/[jobId]/events/route.test.ts" src/app/generate/page.test.tsx'
```

- [ ] **Step 2: Run full unit/integration suite**

```bash
zsh -lc 'npm exec vitest run'
```

- [ ] **Step 3: Run production build**

```bash
zsh -lc 'npm exec next build'
```

- [ ] **Step 4: Manual smoke check**

Run app, submit one generation task, confirm:
- english stage text starts appearing before completion
- later rounds also show progressive text
- failed round can retry on same job
- durable final reader CTA still appears

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "Ship live stage streaming for generation"
```

## Risks And Guardrails

1. **Structured output streaming may not be directly supported**
   - fallback: stream raw text first, parse at the end, and only persist if parse succeeds
2. **Transient drafts are process-local**
   - acceptable for v1 because durable state still comes from job snapshots
   - reconnect after process restart may lose in-progress draft, but never loses completed work
3. **Vocabulary and translation drafts are not naturally structured mid-stream**
   - UI must present them as live text drafts, not final parsed cards, until stage success lands
4. **SSE payload volume will increase**
   - throttle emission by change detection and short polling intervals
5. **Retry must clear stale draft state**
   - otherwise users may see previous-attempt text during new attempts

## Acceptance Checklist

- [ ] The user sees draft text appearing during stage execution, not only after stage completion
- [ ] Durable stage previews still replace drafts when each stage succeeds
- [ ] Same-job retry remains free and resumes from the first incomplete durable stage
- [ ] Final article assembly remains based only on durable stage outputs
- [ ] Full `vitest` and `next build` pass
