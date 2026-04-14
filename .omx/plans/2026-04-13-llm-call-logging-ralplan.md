# RALPLAN: Development LLM Call Logging for Lexora

## Scope

Design an implementation-ready plan for a development-only LLM debug surface that makes the current two LLM flows observable in-browser:

- `generate`: article generation via [src/features/generation/article-generator.ts](/Users/pipilu/Documents/MaDun/lexora/src/features/generation/article-generator.ts)
- `word` / `phrase`: reader explain via [src/features/reader/reader-explain-service.ts](/Users/pipilu/Documents/MaDun/lexora/src/features/reader/reader-explain-service.ts)

Primary requirements source:
- [.omx/specs/deep-interview-llm-call-logging.md](/Users/pipilu/Documents/MaDun/lexora/.omx/specs/deep-interview-llm-call-logging.md)

## RALPLAN-DR Summary

### Principles

1. Preserve developer diagnosis speed over observability breadth.
2. Keep the first release narrow: development-only, latest call only, two existing flows only.
3. Capture debug evidence at the actual LLM boundary, not at loosely related UI layers.
4. Separate business responses from debug transport as much as possible.
5. Redact sensitive inputs by design, not by convention.

### Decision Drivers

1. The panel must let a developer diagnose a failed call within 10 seconds.
2. The solution must work for both a synchronous request (`reader/explain`) and an async background job (`generate`).
3. The solution must expose raw model output and parsed result without storing full prompts, source text, secrets, or user identity.

### Viable Options

#### Option A: Dedicated dev debug store + dedicated dev API + page panel

Summary:
- Add a shared server-side debug recorder at the LLM invocation boundary.
- Persist only the latest sanitized event in an in-memory dev store.
- Expose it via a dev-only API route.
- Render a page-level developer panel that reads from that API.

Pros:
- Clean separation between product responses and debug surface.
- Works for both sync and async flows.
- Avoids polluting user-facing API contracts with debug-only fields.
- Keeps “latest call only” naturally bounded.

Cons:
- Requires one extra dev-only API and client refresh path.
- Dev-store state is process-local and resets on server restart.

#### Option B: Inline debug payload in existing API responses / job status responses

Summary:
- Attach debug metadata directly to `/api/reader/explain` responses and `/api/generate/[jobId]` status responses.

Pros:
- Fewer moving pieces.
- No extra dev-only endpoint.

Cons:
- Couples business payloads to debug-only needs.
- Awkward for `generate` because the actual LLM call happens in detached background work.
- Encourages route-specific ad hoc logic instead of a unified recorder.
- Harder to keep the debug payload contract consistent across flows.

#### Option C: Database-backed debug log table

Summary:
- Store each debug event in persistence and read it into a panel.

Pros:
- Stable history and easier later analytics expansion.

Cons:
- Violates the agreed non-goal of no long-term log storage.
- Adds schema, migration, retention, and data-risk overhead that first release does not need.

### Recommendation

Choose **Option A**.

Reason:
- It is the only option that stays aligned with all three dominant drivers at once: 10-second diagnosis, support for both async and sync flows, and no long-term storage of sensitive/debug-only material.
- Option B is tempting for speed, but it becomes brittle immediately because `generate` is not a normal request-response LLM interaction.
- Option C is out of scope by product agreement.

Invalidation rationale:
- Option B remains viable only if the product later accepts route contract pollution and flow-specific behavior.
- Option C is invalid for V1 because it conflicts with the approved scope and data boundary.

## Brownfield Grounding

### Observed code paths

- [src/app/api/generate/route.ts](/Users/pipilu/Documents/MaDun/lexora/src/app/api/generate/route.ts) creates a generation job, then launches `void processJob(...)`.
- [src/features/generation/article-generator.ts](/Users/pipilu/Documents/MaDun/lexora/src/features/generation/article-generator.ts) currently calls `ChatOpenAI(...).withStructuredOutput(promptOutputSchema).invoke(...)`.
- [src/app/api/generate/[jobId]/route.ts](/Users/pipilu/Documents/MaDun/lexora/src/app/api/generate/[jobId]/route.ts) is already polled by the generate page.
- [src/app/api/reader/explain/route.ts](/Users/pipilu/Documents/MaDun/lexora/src/app/api/reader/explain/route.ts) is synchronous and directly returns the explain payload.
- [src/components/generate/generate-page-client.tsx](/Users/pipilu/Documents/MaDun/lexora/src/components/generate/generate-page-client.tsx) already polls for job status and is an obvious host for a debug panel.
- [src/components/reader/reader-shell.tsx](/Users/pipilu/Documents/MaDun/lexora/src/components/reader/reader-shell.tsx) directly triggers explain requests and is the natural host for a reader-side debug panel.

### SDK capability check

LangChain JS supports `withStructuredOutput(schema, { includeRaw: true })`, which returns both parsed output and raw `AIMessage`. This removes the need for a manual JSON parse path just to capture raw output. Source: [LangChain JS models docs](https://docs.langchain.com/oss/javascript/langchain/models).

## Proposed Design

### 1. Add a dev-only LLM debug feature module

Create a new feature group, for example:

- `src/features/llm-debug/debug-config.ts`
- `src/features/llm-debug/debug-types.ts`
- `src/features/llm-debug/debug-redaction.ts`
- `src/features/llm-debug/debug-store.ts`
- `src/features/llm-debug/debug-recorder.ts`

Responsibilities:
- Decide whether debug logging is enabled.
- Define a normalized event shape.
- Redact inputs before recording.
- Store only the latest event per debug channel.
- Provide a single API for LLM-call instrumentation.

### 2. Normalize the event model around the product’s actual diagnosis needs

Use a small, explicit event type:

```ts
type LlmDebugChannel = 'generate' | 'reader-explain';

type LlmDebugEvent = {
  channel: LlmDebugChannel;
  phase: 'started' | 'succeeded' | 'failed';
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  inputSummary: {
    invocationType: 'generate' | 'word' | 'phrase';
    trigger: string;
    sentenceId?: string;
  };
  rawOutput?: string | null;
  parsedOutput?: unknown;
  error?: {
    message: string;
    name?: string;
    stage: 'invoke' | 'parse' | 'post-process';
  } | null;
};
```

Notes:
- `rawOutput` is the model’s raw response body for that one call.
- `parsedOutput` is the structured result after LangChain schema parsing.
- No full prompt, no full input text, no secrets, no user identity.

### 3. Gate the feature explicitly for development

Use a helper such as:

- enabled when `process.env.NODE_ENV === 'development'`
- optional override env such as `LLM_DEBUG_PANEL=1` for local test harnesses if needed

Effects:
- Server recorder becomes a no-op outside development.
- Dev API route rejects outside development.
- UI panel is not rendered outside development.

### 4. Use a process-local “latest event” store, not persistence

Back the debug store with a `globalThis` singleton Map:

- key: `channel`
- value: latest `LlmDebugEvent`

Why:
- The agreed scope is “latest call only” and “no long-term database storage”.
- This is sufficient in local dev where the same server process handles the calls.

Known constraint:
- State is lost on dev server restart or full reload.
- This is acceptable because the feature is explicitly development-only.

### 5. Instrument at the actual LLM boundary using `includeRaw: true`

Replace direct structured-output invocations with a shared helper, conceptually:

```ts
await invokeStructuredWithDebug({
  channel: 'generate',
  inputSummary: { invocationType: 'generate', trigger: 'generate-page-submit' },
  messages,
  model: new ChatOpenAI(...),
  schema: promptOutputSchema,
});
```

and

```ts
await invokeStructuredWithDebug({
  channel: 'reader-explain',
  inputSummary: {
    invocationType: input.mode,
    trigger: 'reader-selection',
    sentenceId: input.sentenceId,
  },
  messages,
  model: new ChatOpenAI(...),
  schema: input.mode === 'word' ? wordExplainOutputSchema : phraseExplainOutputSchema,
});
```

The helper should:
- emit `started`
- invoke `withStructuredOutput(schema, { includeRaw: true })`
- extract raw text from the returned `raw` message
- capture `parsed`
- emit `succeeded` or `failed`
- tag failure stage precisely:
- `invoke`: upstream/network/model failure
- `parse`: structured output invalid
- `post-process`: later validation/build step failed

### 6. Keep route contracts clean with one dedicated dev API

Add a route such as:

- `GET /api/dev/llm-debug?channel=generate`
- `GET /api/dev/llm-debug?channel=reader-explain`

Behavior:
- returns `204` if there is no event yet
- returns `403/404` outside development
- returns the latest sanitized event for that channel

Why this is preferred:
- business routes remain product-focused
- the panel gets a stable contract
- generate and reader can use the same read path

### 7. Split UI refresh strategy by flow shape

#### Generate flow

Host:
- [src/components/generate/generate-page-client.tsx](/Users/pipilu/Documents/MaDun/lexora/src/components/generate/generate-page-client.tsx)

Behavior:
- render a dev-only `LlmDebugPanel` near the job status card
- when a job is pending/processing, poll the debug endpoint for `channel=generate`
- on job done/failed, fetch once more to capture the final event

Rationale:
- the real LLM call happens in background work, so client pull is the simplest consistent bridge

#### Reader explain flow

Host:
- [src/components/reader/reader-shell.tsx](/Users/pipilu/Documents/MaDun/lexora/src/components/reader/reader-shell.tsx)

Behavior:
- render a dev-only `LlmDebugPanel` near the explain panel state
- after each explain request settles, refresh `channel=reader-explain` once

Rationale:
- the request is synchronous, so a single post-request refresh is enough
- avoid adding continuous polling to a frequent interaction path

### 8. Design the panel for diagnosis, not observability theater

Show only the latest invocation and prioritize scan speed:

- header: channel + phase + timestamp + duration
- input summary:
- invocation type
- trigger
- sentenceId (if present)
- raw output: scrollable preformatted block
- structured result: JSON viewer / code block
- error: highlighted block if present

Optional but low-risk fields if cheaply available:
- model name
- schema label

Do not show:
- system prompt body
- user prompt body
- article source text / uploaded file text
- headers / secrets
- user identity

## Implementation Plan

### Phase 1: Shared debug foundation

1. Add `llm-debug` feature module:
- config gate
- event types
- redaction helpers
- process-local latest-event store
- recorder helper

2. Add a dev-only API route that returns the latest event by channel.

3. Add unit tests for:
- dev gating
- event replacement semantics (“latest only”)
- input redaction
- event shape normalization

### Phase 2: Instrument the two LLM services

1. Update [src/features/generation/article-generator.ts](/Users/pipilu/Documents/MaDun/lexora/src/features/generation/article-generator.ts):
- switch to `includeRaw: true`
- record `generate` events
- tag post-process failures after raw/parsed capture if `buildArticle` fails

2. Update [src/features/reader/reader-explain-service.ts](/Users/pipilu/Documents/MaDun/lexora/src/features/reader/reader-explain-service.ts):
- switch to `includeRaw: true`
- record `reader-explain` events with `word` / `phrase` and `sentenceId`

3. Add service tests for:
- success path records raw + parsed
- parse failure records raw + parse-stage error
- post-process failure records raw/parsed + post-process error

### Phase 3: Render the in-browser debug panel

1. Add a reusable client component:
- `src/components/system/llm-debug-panel.tsx`

2. Mount it into:
- [src/components/generate/generate-page-client.tsx](/Users/pipilu/Documents/MaDun/lexora/src/components/generate/generate-page-client.tsx)
- [src/components/reader/reader-shell.tsx](/Users/pipilu/Documents/MaDun/lexora/src/components/reader/reader-shell.tsx)

3. Refresh behavior:
- generate: poll while active job exists
- reader: refresh once after explain completion/failure

4. Add component tests for:
- dev-only visibility
- empty state
- success rendering
- error rendering
- refresh behavior on interaction

### Phase 4: Acceptance verification

Run verification that proves the product requirement, not just code coverage:

1. Trigger a failed generate call in local dev and confirm:
- panel appears
- input summary is visible
- raw output is visible
- parsed output or parse failure is visible
- error cause is visible

2. Trigger a failed word/phrase explain call and confirm the same.

3. Confirm restricted fields are absent from the panel payload and UI.

## Test Plan

### Unit

- `debug-config` returns false outside development
- `debug-store` keeps latest event per channel only
- `debug-redaction` never passes through disallowed fields
- `extractRawMessageContent` handles string and structured content blocks safely

### Integration / service

- generation service emits `started` then `succeeded`
- generation service emits `failed` with `post-process` when `buildArticle` rejects after model success
- reader explain service emits `failed` with `invoke` or `parse` semantics as appropriate
- dev API returns latest event, empty state, and rejects when disabled

### UI / interaction

- generate page shows panel only in development
- generate panel updates while a job is in progress
- reader panel refreshes after an explain request
- panel renders raw output, parsed output, and error in separate visible sections

### Acceptance / manual

- A developer can trigger one failing call and, within 10 seconds, identify:
- invocation type
- trigger
- sentenceId when applicable
- raw output
- parsed result
- failure reason

## Risks

1. **Process-local memory store may be stale or reset**
- acceptable in dev-only scope
- must be documented as non-production behavior

2. **Raw model output may be large**
- panel should use a scrollable code block and preserve only the latest event

3. **LangChain raw message content shape may vary**
- isolate content extraction in one helper and test it

4. **Generate background flow can outlive the initiating request**
- why the design uses independent dev API reads instead of piggybacking only on the initial POST response

## Non-goals

- prompt diffing or prompt history
- token/cost analytics
- long-term call history
- production observability
- multi-user debug isolation
- a generalized observability framework for all external APIs

## ADR

### Decision

Adopt a **development-only, in-memory latest-event LLM debug subsystem** with a dedicated dev read API and page-level debug panels on generate and reader surfaces.

### Drivers

- Need fast failure diagnosis
- Must support both async job and sync request flows
- Must not store disallowed sensitive inputs or create durable audit logs

### Alternatives considered

1. Inline debug payload in existing API responses
2. Database-backed debug logs
3. Console-only logging

### Why chosen

- It keeps instrumentation close to the LLM boundary.
- It works for both current flow shapes.
- It provides a stable client-visible surface without mutating product API contracts heavily.
- It satisfies “latest only” without adding data-retention burden.

### Consequences

- Adds a dedicated debug subsystem and dev-only route.
- Requires small client-side refresh logic in two surfaces.
- Debug state is intentionally ephemeral and process-local.

### Follow-ups

- If later needed, add an explicit “recent calls list” on top of the same subsystem.
- If production observability ever becomes a real requirement, design a separate audited path rather than stretching this dev tool.

## Execution Guidance

### Available agent types

- `architect`
- `executor`
- `test-engineer`
- `critic`
- `verifier`
- `writer`

### If executed via `ralph`

Recommended sequence:
1. foundation: add debug feature module + tests
2. service instrumentation: generation then reader explain
3. UI: panel component and page wiring
4. verification: route tests, component tests, manual dev proof

Reasoning guidance:
- `executor`: high
- `test-engineer`: medium
- `verifier`: high

### If executed via `$team`

Recommended lanes:
- Lane 1 (`executor`): shared `llm-debug` foundation + dev API route
- Lane 2 (`executor`): generation instrumentation + generate page panel wiring
- Lane 3 (`executor` or `test-engineer`): reader instrumentation + reader panel wiring + focused tests
- Final verification lane (`verifier`): cross-flow acceptance proof and residual-risk review

Team verification path:
1. verify latest-event semantics
2. verify generate path end-to-end
3. verify reader explain path end-to-end
4. verify disallowed fields never appear
5. verify non-dev gating works

### Suggested launch hint

- Sequential: `$ralph /Users/pipilu/Documents/MaDun/lexora/.omx/plans/2026-04-13-llm-call-logging-ralplan.md`
- Parallel: `$team /Users/pipilu/Documents/MaDun/lexora/.omx/plans/2026-04-13-llm-call-logging-ralplan.md`
