# Test Spec: Dev-Only LLM Call Logging Panel

## Scope

This test spec covers only:
- article generation via `src/app/api/generate/route.ts`
- word / phrase explain via `src/app/api/reader/explain/route.ts`

Excluded:
- persistent log history
- production telemetry
- any LLM flow outside these two paths

## Acceptance Target

When a local development LLM call fails, a developer can identify the failure cause within 10 seconds by reading the browser page's latest-call debug panel.

Required visible sections:
- input summary
- raw output
- structured result
- error information

Required exclusions:
- full system prompt
- full user prompt
- full article/uploaded text
- API keys / headers
- user identity

## Verification Matrix

### A. Shared trace contract

1. Redaction allowlist
   - input: full generate input and prompt-building context
   - assert: output summary contains only allowed fields
2. Disabled gate
   - input: debug env off
   - assert: capture helper returns no exposed payload
3. Error staging
   - invoke failure maps to `llm_invoke`
   - schema or structured parse failure maps to `structured_output`
   - article build failure maps to `post_process`
   - `parsed: null` is normalized into a visible structured failure state rather than treated as a business success

### B. Generate async flow

1. Success path
   - job polling payload includes `llmDebug`
   - `llmDebug` is merged from a dev-only sidecar store, not durable job persistence
   - panel shows latest call summary/result
2. Failure path
   - job polling payload includes raw output + error details
   - panel updates after poll without page reload
   - sidecar miss degrades gracefully without breaking the status card
3. Disabled path
   - no debug payload returned
   - status card continues to work unchanged

### C. Reader explain sync flow

1. Word explain success
   - response includes explanation data + `llmDebug`
   - panel shows debug section inside word panel
2. Phrase explain success
   - same as above for phrase
3. Explain failure
   - route returns `{ error, llmDebug }`
   - client still renders latest debug payload and explicit error message
   - local fallback content does not erase the fact that the upstream LLM call failed
4. Disabled path
   - no debug section rendered

## Suggested Automated Coverage

### Unit

- `src/features/llm-debug/redact.test.ts`
- `src/features/llm-debug/capture.test.ts`
- `src/features/llm-debug/debug-store.test.ts`
- service-focused tests around generate/explain trace mapping

### Integration

- `src/app/api/generate/route.test.ts`
- `src/app/api/generate/[jobId]/route.test.ts`
- `src/app/api/reader/explain/route.test.ts`

### Component

- generate page status area renders debug panel
- word panel desktop/mobile render debug panel
- empty/disabled states do not regress current UX

## Manual Validation Script

### Scenario 1: Generate failure

1. Start app in local development with debug enabled.
2. Force a generation failure or malformed structured output.
3. Submit a generate request.
4. Wait for status to reach failed.
5. Confirm the page shows:
   - call type `generate`
   - trigger `generate_page`
   - source summary
   - raw output
   - structured result state
   - error stage and message
6. Confirm no full prompt/full article text/secrets/user identity are visible.

### Scenario 2: Word explain failure

1. Open a reader page.
2. Trigger a word explanation that fails.
3. Confirm the side panel shows:
   - call type `word`
   - sentence id
   - selected text
   - raw output
   - structured result state
   - error stage and message
4. If local fallback content appears, confirm the debug section still marks the LLM call as failed rather than silently presenting a pure success state.

### Scenario 3: Phrase explain failure

1. Trigger a phrase explanation failure.
2. Confirm the same visibility and redaction guarantees.

### 10-second acceptance check

For each failure scenario, use this prompt with a reviewer unfamiliar with the implementation:

`Within 10 seconds, tell me whether the likely fault is input context, model output, or parser/post-process.`

Pass condition:
- reviewer answers correctly without opening DevTools, terminal, or source files

Fail condition:
- reviewer needs to inspect network/console/code to identify the likely fault domain

## Exit Criteria

- automated tests pass for shared trace, routes, and panels
- manual validation passes for generate, word, and phrase
- redaction constraints are verified
- generate debug data is not written into durable business persistence
- acceptance target is met in local development
