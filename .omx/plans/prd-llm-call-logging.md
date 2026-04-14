# PRD: Dev-Only LLM Call Logging Panel

## Metadata

- Source spec: `/Users/pipilu/Documents/MaDun/lexora/.omx/specs/deep-interview-llm-call-logging.md`
- Context type: brownfield
- Scope: `generate`, `word`, `phrase`
- Status: Planner draft for Architect / Critic review

## RALPLAN-DR Summary

### Principles

1. Developer visibility beats exhaustiveness: show the minimum fields needed to localize failure fast.
2. Browser-first over terminal-first: the primary debug surface must live in the page where the action happened.
3. Shared capture, route-specific presentation: unify server-side logging shape, adapt transport to each flow.
4. Redaction is a hard boundary, not a presentation preference: never expose full prompts, full source text, secrets, or user identity.
5. V1 stays ephemeral: latest-call only, dev-only, no database retention.

### Decision Drivers

1. `generate` and `reader explain` have different execution shapes, so the bridge from server-side LLM invocation to browser UI cannot be identical.
2. The current repository already has stable UI insertion points for a debug surface: the generate status card and the reader explain side panel.
3. The feature must preserve enough raw evidence for diagnosis while still enforcing the interview's non-goals.

### Viable Options

#### Option A: Existing API transport with dev-only sidecar trace storage

Summary:
Return a structured `debug` object through the existing API surfaces, while keeping async generate traces in a dev-only latest-only sidecar store keyed by `jobId`.

Pros:
- No new client polling channel for `reader explain`; the response already returns immediately.
- No global browser event bus or client store required for V1.
- Fits the existing generate polling flow because `/api/generate/[jobId]` already provides the browser with ongoing state updates.
- Keeps logging scoped to the route/request boundary, which helps avoid accidental cross-user leakage.
- Preserves the non-goal of no long-term database-backed debug storage.

Cons:
- `generate` still needs a sidecar trace store while the async background job runs, because the original POST returns before the LLM call completes.
- Route payloads get wider and need versioned typing on both client and server.
- If future pages need cross-page debug visibility, this approach will need an additional transport layer.

#### Option B: Global dev-only in-memory debug event store plus dedicated debug endpoint / client fetch

Summary:
Write every LLM trace to a process-local store keyed by route/job, then let the page fetch the latest record from a dedicated debug API.

Pros:
- One shared retrieval mechanism for both sync and async flows.
- Easier to expand to a "recent calls" list later.
- Decouples business API responses from debug payload shape.

Cons:
- Introduces another API surface and freshness/synchronization rules on day one.
- In-memory store behavior gets trickier under Next.js server runtime/process churn, especially for local background work.
- More moving parts than necessary for a latest-only V1.

#### Option C: Client-only reconstruction from existing UI state plus extra console logging

Summary:
Do not capture server traces structurally; infer what happened from request inputs, route error messages, and console output.

Pros:
- Lowest implementation cost.
- Minimal server changes.

Cons:
- Fails the core requirement: it cannot show raw model output or structured parse result reliably.
- Pushes developers back toward terminal/code inspection.
- Not viable for the stated acceptance target.

### Recommended Option

Choose **Option A**.

Reason:
- It preserves one shared capture shape while using the lowest-friction transport already present in each flow.
- It keeps V1 tightly scoped to "latest call on the current page" instead of overbuilding an event infrastructure.
- It maps directly onto the existing code paths:
  - `generateArticle()` already concentrates the LLM call and parse/build failure points in one place.
  - `explainReaderSelection()` already concentrates the sync request/response cycle in one place.
  - `generate-page-client.tsx` already has a status-card slot.
  - `reader-shell.tsx` already has an explain-panel state machine and panel container.

## Problem

Today the repository has two direct LLM call sites:

- `src/features/generation/article-generator.ts` invokes `ChatOpenAI(...).withStructuredOutput(...).invoke(...)` for article generation.
- `src/features/reader/reader-explain-service.ts` invokes `ChatOpenAI(...).withStructuredOutput(...).invoke(...)` for word/phrase explanation.

When these calls fail or produce malformed results, the browser surfaces only a coarse failure state. Developers cannot immediately inspect the sanitized input context, raw model output, parse outcome, or exact error source from the page they are already using.

## Goals

- In development, show the latest LLM call details directly in the browser for both supported flows.
- Let a developer distinguish among:
  - bad/surprising input context,
  - raw model output problems,
  - structured parsing / post-processing failures.
- Keep the payload redacted and bounded.

## Non-goals

- Production logging or operator tooling.
- Persistent history or database-backed audit logs.
- Multi-call timeline UI.
- Full prompt replay or full source-text replay.
- Coverage outside `generate` and `word` / `phrase` explain.

## Recommended System Design

### 1. Shared server-side trace contract

Add a dev-only tracing module, e.g. `src/features/llm-debug/`, with three responsibilities:

- `types.ts`
  - define a transport-safe `LlmDebugRecord`
  - define nested sections:
    - `summary`
    - `rawOutput`
    - `structuredResult`
    - `error`
    - `meta`
- `redact.ts`
  - build allowed summaries from raw inputs
  - enforce prompt/text/user/secret exclusion centrally
- `capture.ts`
  - helper to execute or wrap an LLM invocation and collect:
    - call type
    - trigger source
    - route kind (`generate` / `word` / `phrase`)
    - model name
    - timing
    - raw output text or serialized object before post-processing
    - structured parse result if available
    - error stage and message if failure occurs
  - includes a normalization layer that converts LangChain’s structured-output result into:
    - `rawMessage`
    - `rawPreview`
    - `parsed`
    - `structuredStatus: 'success' | 'parse_failed' | 'missing'`

Suggested record shape:

```ts
type LlmDebugRecord = {
  enabled: boolean;
  callId: string;
  timestamp: string;
  summary: {
    callType: 'generate' | 'word' | 'phrase';
    trigger: 'generate_page' | 'reader_panel';
    sentenceId?: string;
    selectedText?: string;
    sourceType?: 'url' | 'file';
    sourceRefLabel?: string;
    model: string;
  };
  rawOutput: {
    text?: string;
    json?: unknown;
    available: boolean;
  };
  structuredResult: {
    data: unknown | null;
    status: 'success' | 'missing' | 'parse_failed';
  };
  error: {
    stage:
      | 'request_validation'
      | 'llm_invoke'
      | 'structured_output'
      | 'post_process'
      | 'job_process'
      | 'route';
    message: string;
  } | null;
  meta: {
    durationMs: number;
    attempt?: number;
  };
};
```

Key boundary:
- `summary` is allowlist-only.
- `rawOutput` can contain the model's returned text/JSON, but never the full system prompt, human prompt, or full source article text.
- `rawOutput` is a sanitized preview of the returned `AIMessage` / tool-call payload, not a promise that a simple raw string will always exist.

### 2. Dev environment gate

Add one explicit env switch in `src/lib/env.ts`, e.g. `LLM_DEBUG_PANEL_ENABLED`, defaulting to `process.env.NODE_ENV === 'development'`.

Behavior:
- In `development`: enabled by default.
- In `test`: off by default unless explicitly enabled for targeted tests.
- In `production`: off unless manually forced for local diagnosis, but the product requirement still treats this as dev-only.

Use a single helper such as `isLlmDebugEnabled()` so route/service/UI code does not re-encode environment logic.

### 3. Redaction strategy

Hard exclusions:
- full `SystemMessage`
- full `HumanMessage`
- full source text / uploaded article text
- API keys / headers / auth/session identifiers
- user identity

Allowed input summary fields:
- `callType`
- `trigger`
- `sentenceId` when present
- selected text for `word` / `phrase`
- source type for `generate`
- sanitized source label:
  - URL origin + pathname tail or hostname, not the full raw URL query string
  - file name only
- model name

Recommended implementation rule:
- build summaries from route/service inputs before prompt construction, not by trying to redact built prompt strings afterward.

### 4. Generate flow integration

Current flow:
- `src/app/api/generate/route.ts` POST creates a job and launches `processJob()`.
- `processJob()` extracts content, calls `generateArticle()`, and updates job status.
- `src/app/api/generate/[jobId]/route.ts` returns job state for browser polling.
- `src/components/generate/generate-page-client.tsx` renders the status card from the polled payload.

Recommended integration:

1. Add a dev-only latest-only sidecar trace store keyed by `jobId`; do not persist debug payloads into the `GenerationJob` database model.
2. In `processJob()`, create a trace context before calling `generateArticle()`.
3. In `generateArticle()`, capture:
   - sanitized input summary from `source`, `titleHint`, and route trigger
   - normalized raw preview from the LangChain call
   - normalized structured result from `withStructuredOutput(schema, { includeRaw: true })`
   - any error thrown by:
     - `invokeModel`
     - `buildArticle`
     - retry exhaustion
4. Update the latest debug snapshot in the sidecar store as the job progresses.
5. Extend `/api/generate/[jobId]` to merge `llmDebug` into the response when debug is enabled.
6. In `generate-page-client.tsx`, render a dev panel beneath or inside the existing status card. It should update on the same polling cadence as job status and always show the latest call only.

Why this fits the current code:
- The page already polls for `job.status`, so adding `job.llmDebug` avoids a second client fetch loop.
- The status card at `src/components/generate/generate-page-client.tsx` already owns the "what happened to this job" surface.
- The async job boundary means an in-request-only response payload is insufficient; the trace must survive until the next poll.
- A sidecar store preserves that behavior without converting debug traces into durable records.

### 5. Reader explain flow integration

Current flow:
- `reader-shell.tsx` issues a direct POST to `/api/reader/explain`.
- The page already tracks `loading / success / error` state and opens a panel.
- `word-panel-desktop.tsx` and `word-panel-mobile.tsx` are the concrete panel containers.

Recommended integration:

1. In `explainReaderSelection()`, wrap the `requestExplanation()` call with the shared trace capture helper.
2. The route `src/app/api/reader/explain/route.ts` returns:
   - the business payload as today on success
   - plus a `llmDebug` field when debug is enabled
   - on failure, a JSON body shaped as `{ error, llmDebug }` when debug is enabled, so the client can still render the latest trace
3. In `reader-shell.tsx`, change the fetch handling so it parses JSON before branching on `response.ok`, then stores a second state branch:
   - `latestExplainDebug`
   - this prevents `!response.ok` from discarding the debug payload on failures
4. Render a dev-only debug section inside the existing word panel container, below the current explanation content.

Why the panel should be nested here:
- The explanation panel is already the place developers inspect explain output.
- It avoids introducing a second floating panel competing with the word lookup UI.
- The route is synchronous, so the response can carry the trace immediately without a separate store.

### 6. UI contract for the browser dev panel

For both surfaces, keep one shared presentational component, e.g.:
- `src/components/system/llm-debug-panel.tsx`

Props:
- `record: LlmDebugRecord | null`
- `emptyLabel`
- `surface: 'generate' | 'reader'`

Display order:
1. Header
   - `LLM 调用日志（开发环境）`
   - call type badge
   - success/failure badge
   - duration
2. Input summary
3. Raw output
4. Structured result
5. Error information

UI behavior:
- failure state: expanded by default
- success state: compact header + one-click expand
- empty state:
  - `generate`: "本次任务尚未产生 LLM 调用日志"
  - `reader`: "本次解释尚未产生 LLM 调用日志"
- if disabled, render nothing
- raw preview uses truncation with expand-on-demand for long payloads

## Module Boundaries

### Server

- `src/features/llm-debug/*`
  - owns tracing types, redaction, and capture helpers
- `src/features/llm-debug/debug-store.ts`
  - owns latest-only dev sidecar storage keyed by `jobId`
- `src/features/generation/article-generator.ts`
  - provides generate-specific summary fields
  - hands raw invocation events to shared tracing
- `src/features/reader/reader-explain-service.ts`
  - provides explain-specific summary fields
  - hands raw invocation events to shared tracing
- route handlers
  - decide whether to include `llmDebug` in JSON responses
  - merge async debug payloads from the sidecar store for generate polling

### Client

- `src/components/system/llm-debug-panel.tsx`
  - pure presentational renderer for a single latest record
- `src/components/generate/generate-page-client.tsx`
  - receives polled `llmDebug`
  - mounts panel in the existing status area
- `src/components/reader/reader-shell.tsx`
  - stores latest explain debug payload
  - passes it into desktop/mobile word panel
- `src/components/reader/word-panel-desktop.tsx`
- `src/components/reader/word-panel-mobile.tsx`
  - receive optional debug panel section

## Data Flow

### Generate

1. User submits generate form.
2. `POST /api/generate` creates job and starts `processJob()`.
3. `processJob()` calls `generateArticle()` with tracing enabled.
4. `generateArticle()` captures latest LLM debug record.
5. Sidecar store updates the latest `llmDebug` keyed by `jobId`.
6. Client polling `GET /api/generate/[jobId]` receives job status + optional merged `llmDebug`.
7. Generate page status card renders the latest trace.

### Reader Explain

1. User selects word/phrase in reader.
2. `reader-shell.tsx` calls `POST /api/reader/explain`.
3. Route calls `explainReaderSelection()` with tracing enabled.
4. Route returns explanation payload + optional `llmDebug`.
5. Reader shell stores the response in panel state.
6. Existing word panel renders business result plus debug section underneath.

## Minimal Implementation Steps

### PR 1: Shared trace contract and server capture

- Add `src/features/llm-debug/` with types, env gate, redaction helpers, and a capture helper.
- Add env switch in `src/lib/env.ts`.
- Refactor `article-generator.ts` and `reader-explain-service.ts` so both can emit the same `LlmDebugRecord`.
- Ensure generate capture marks failures from both model invocation and post-processing (`buildArticle()`).

### PR 2: Async job plumbing for generate

- Add sidecar latest-trace storage keyed by `jobId`.
- Update `processJob()` and `GET /api/generate/[jobId]` to populate/return `llmDebug`.
- Add typed client support in `generate-page-client.tsx`.

### PR 3: Browser dev panel UI

- Add shared `llm-debug-panel` component.
- Mount it in the generate status card.
- Extend reader explain route and shell state to include `llmDebug`.
- Mount the panel inside desktop/mobile word panel containers.

### PR 4: Verification hardening

- Add or update tests across route, service, and UI layers.
- Add one explicit manual verification checklist for the 10-second diagnosis target.

## Test Plan

### Unit

1. `src/features/llm-debug/redact.test.ts`
   - summary includes only allowlisted fields
   - full prompt text and full source text are excluded
   - URL/file source labels are sanitized
2. `src/features/llm-debug/capture.test.ts`
   - success record contains summary, raw output preview, structured result, no error
   - invocation failure sets `error.stage = 'llm_invoke'`
   - `parsed === null` or equivalent structured-output miss maps to `error.stage = 'structured_output'`
   - post-process failure sets `error.stage = 'post_process'`
   - if `includeRaw` is insufficient on parse failure, helper falls back to a tested raw-preview path
3. service-level tests
   - `article-generator` trace survives retry and reflects final failure
   - `reader-explain-service` trace differs correctly for `word` vs `phrase`

### Integration

1. `src/app/api/generate/[jobId]/route.test.ts`
   - returns `llmDebug` only when enabled
   - omits or nulls it when disabled
2. `src/app/api/reader/explain/route.test.ts`
   - returns explanation payload plus `llmDebug` on success
   - returns `{ error, llmDebug }` on debug-enabled failure
   - redacted fields are absent
3. `src/app/api/generate/route.test.ts`
   - process flow updates latest debug snapshot on failure and success without writing it into durable job storage

### Page interaction

1. Generate page component test
   - polling response with failed job + `llmDebug` renders:
     - input summary
     - raw output
     - structured result
     - error
2. Reader shell / panel test
   - explain fetch response with `llmDebug` renders the debug section inside the existing panel
   - failed explain response still preserves and renders `llmDebug`
   - local fallback word success does not erase the visible fact that the upstream LLM call failed
3. Disabled-mode UI test
   - panel is absent when debug feature flag is off

### Manual verification for acceptance target

Run in local development:

1. Trigger a generate failure using intentionally malformed or mock-failed LLM output.
2. Confirm the generate page shows, within one poll cycle:
   - input summary
   - raw output
   - structured result or parse-failed status
   - explicit error stage/message
3. Trigger a word and phrase explain failure.
4. Confirm the reader panel shows the same four sections without leaving the page.
5. Time-box the check:
   - starting from visible failure state, a developer should be able to identify likely fault domain within 10 seconds.

Suggested heuristic for the final manual check:
- if a fresh contributor cannot answer "input issue vs model issue vs parser issue" within 10 seconds, the panel copy/order is not good enough.

## Risks

- The generate flow needs a trace payload to survive the async background boundary; the sidecar store needs a cleanup rule so stale debug blobs do not outlive local sessions indefinitely.
- LangChain `withStructuredOutput(..., { includeRaw: true })` is the preferred capture primitive, but parse-failure raw capture must be proven by a spike test; if it is insufficient, the helper needs a manual fallback.
- Next.js local runtime behavior may make any process-local storage brittle; the plan accepts this because the store is dev-only and latest-only, but it must define cleanup semantics.
- Raw output can still be large; V1 may need truncation rules to keep the page readable without violating the "latest detail only" goal.

## Explicit Non-targets

- historical timeline
- export/share of debug payloads
- prompt inspector
- cost/token analytics
- non-browser-first surfaces

## ADR

### Decision

Adopt a shared dev-only `LlmDebugRecord` capture layer and expose the latest record through existing API response shapes:
- merged into generate polling responses from a dev-only sidecar store keyed by `jobId`
- returned inline on the reader explain response for sync fetch

### Drivers

- Must be browser-first.
- Must support both async and sync LLM call shapes.
- Must remain redacted and latest-only.

### Alternatives considered

1. Dedicated debug event store and endpoint
   - rejected for V1 because it adds infrastructure without solving an immediate problem that existing route payloads cannot solve
2. Console/terminal-only logging
   - rejected because it fails the interview requirement
3. Client-only reconstruction
   - rejected because raw output and structured parse failure are not reliably recoverable

### Why chosen

This approach reuses existing transport paths already wired into the two user flows, while still forcing a unified server-side capture contract and centralized redaction policy.

### Consequences

- Route payload types will expand.
- Generate needs a dev-only sidecar store and a merge step in its status route.
- UI surfaces must reserve room for a dev-only panel.
- Future expansion to multiple recent calls will likely require a store abstraction, but not in V1.

### Follow-ups

- Spike-test the parse-failure path to confirm whether `includeRaw` preserves enough raw data; branch to manual raw preview capture only if necessary.
- Keep raw output truncated in the default view, with expand-on-demand for long payloads.
- If more LLM flows are added, promote the tracing wrapper from ad hoc helper to a standard service boundary.
- Consider a future "copy sanitized trace" action for debugging, but keep it out of V1.

## Staffing Guidance

### If executed via `ralph`

Single-owner sequence:
1. Implement shared trace contract + redaction helper.
2. Integrate capture into `article-generator` and `reader-explain-service`.
3. Extend generate job plumbing and both routes.
4. Add shared panel component and hook it into generate + reader pages.
5. Run verification from unit to UI/manual acceptance.

Suggested reasoning:
- high for shared trace contract and async generate plumbing
- medium for UI insertion and tests

Why `ralph` fits:
- This work has a shared core abstraction and two dependent integrations; sequential ownership reduces churn on trace types and payload contracts.

### If executed via `team`

Recommended lanes:

1. `executor` lane: shared tracing core
   - `src/features/llm-debug/*`
   - env gate
   - service integration contract
2. `executor` lane: generate async plumbing
   - generation job service
   - `/api/generate` and `/api/generate/[jobId]`
   - sidecar debug store
   - generate page status card integration
3. `executor` lane: reader sync plumbing + UI
   - `/api/reader/explain`
   - `reader-shell`
   - `word-panel-*`
4. `verifier` or `test-engineer` lane: tests + acceptance checklist

Suggested reasoning by lane:
- core tracing lane: high
- generate lane: medium/high
- reader lane: medium
- verifier lane: medium/high

Coordination rule:
- land the `LlmDebugRecord` contract first, then parallelize generate/reader integration against that frozen shape.

## Open Questions For Architect / Critic

1. Define cleanup semantics for sidecar traces keyed by `jobId` in local dev.
2. Prove the `includeRaw` parse-failure behavior with a focused test before finalizing the helper signature.
3. Validate failure-expanded / success-collapsed panel behavior against the 10-second diagnosis acceptance check.
