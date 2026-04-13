# Reader Selection UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild reader word and phrase selection so phrase lookup is explicit, discoverable, and reliable on desktop and mobile without restoring the removed review stage.

**Architecture:** Replace the current split interaction model (desktop native text selection, mobile long-press suggestion sheet) with one shared “token selection -> phrase expansion -> explanation” flow. Keep the existing explain API and panel surfaces, but introduce a dedicated selection state layer in the reader so the UI can preserve highlighted context, expose explicit expansion controls, and constrain suggestions to the user’s current selection neighborhood.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Playwright, existing reader explain services

---

## File Map

**Modify**
- `src/components/reader/article-body.tsx`
  Owns sentence token rendering and will stop relying on native selection as the primary phrase entry path.
- `src/components/reader/reader-shell.tsx`
  Owns reader orchestration and will become the source of truth for active token selection, notices, and explain request dispatch.
- `src/components/reader/mobile-explain-assist.tsx`
  Will be repurposed or simplified into a generic selection action surface instead of a long-press-only shortcut sheet.
- `src/features/reader/reader-phrase-suggestions.ts`
  Must only return phrases anchored to the currently selected token/span.
- `src/features/reader/reader-explain-utils.ts`
  Will gain helpers for converting token ranges into normalized explain payloads.
- `src/lib/ui-copy.ts`
  Needs new instructional copy, selection CTA labels, and clearer notice text.
- `src/components/reader/article-body.test.tsx`
  Must cover the new explicit selection and expansion behavior.
- `src/components/reader/explain-panel-content.test.tsx`
  Add confidence checks that phrase lookups still render the selected text/source sentence correctly after the interaction rewrite.
- `tests/e2e/reader-flow.spec.ts`
  Replace synthetic native-selection-only assertions with realistic user-driven phrase expansion coverage.
- `tests/e2e/mobile-reader.spec.ts`
  Replace long-press-first expectations with explicit mobile selection and expansion coverage.

**Create**
- `src/components/reader/selection-action-bar.tsx`
  Shared action surface anchored to the current word/phrase selection, used on both desktop and mobile.
- `src/features/reader/reader-selection-state.ts`
  Focused helper module for selection range math, neighboring token expansion, and normalization.
- `src/features/reader/reader-selection-state.test.ts`
  Unit tests for the new selection model.

**Maybe Delete**
- Long-press-only behavior in `src/components/reader/mobile-explain-assist.tsx`
  If the new shared action bar fully replaces it, delete the old component and update imports accordingly.

## Product Decisions Locked In

- Phrase lookup must no longer depend on hidden native selection as the primary path.
- Single tap selects one word and shows an action surface near that sentence context.
- Phrase lookup becomes an explicit expansion action from the selected word/span.
- Mobile phrase suggestions must include the selected word/span and remain spatially local.
- Keep native drag selection as an optional compatibility path on desktop only if it maps into the same shared selection state.
- No review-stage restoration in this plan.
- No phrase-saving or words-page expansion in this plan.

## Acceptance Criteria

- A first-time user can discover phrase lookup from the reading surface without trial-and-error.
- The selected word or phrase remains visibly highlighted while the action bar/panel is open.
- Mobile and desktop follow the same mental model even if the presentation differs.
- Phrase suggestions are always anchored to the user’s current word/span.
- Error notices become exceptional fallback states, not the primary way users learn the rules.
- Existing word lookup, explain API calls, and save-word behavior continue to work.

## Task 1: Introduce Shared Selection State

**Files:**
- Create: `src/features/reader/reader-selection-state.ts`
- Test: `src/features/reader/reader-selection-state.test.ts`
- Modify: `src/features/reader/reader-explain-utils.ts`

- [ ] **Step 1: Write failing unit tests for token-range selection behavior**

```ts
import {
  createWordSelection,
  expandSelectionLeft,
  expandSelectionRight,
  selectionToExplainText,
} from '@/features/reader/reader-selection-state';

describe('reader-selection-state', () => {
  it('starts from a single selected word', () => {
    expect(
      createWordSelection({
        sentenceId: 's3',
        sentenceText: 'Guided by clear support, the reader can follow the main idea.',
        tokens: ['Guided', 'by', 'clear', 'support', 'the', 'reader'],
        wordIndex: 2,
      }),
    ).toMatchObject({
      startWordIndex: 2,
      endWordIndex: 2,
      selectedText: 'clear',
    });
  });

  it('expands to adjacent words only', () => {
    const selection = {
      sentenceId: 's3',
      sentenceText: 'Guided by clear support, the reader can follow the main idea.',
      tokens: ['Guided', 'by', 'clear', 'support', 'the', 'reader'],
      startWordIndex: 2,
      endWordIndex: 2,
    };

    expect(expandSelectionRight(selection)?.selectedText).toBe('clear support');
    expect(expandSelectionLeft(selection)?.selectedText).toBe('by clear');
  });

  it('normalizes phrase text for explain validation', () => {
    expect(
      selectionToExplainText({
        sentenceId: 's3',
        sentenceText: 'Guided by clear support, the reader can follow the main idea.',
        tokens: ['Guided', 'by', 'clear', 'support'],
        startWordIndex: 2,
        endWordIndex: 3,
      }),
    ).toBe('clear support');
  });
});
```

- [ ] **Step 2: Run unit tests to verify they fail**

Run: `pnpm test src/features/reader/reader-selection-state.test.ts`

Expected: FAIL because the new module does not exist yet.

- [ ] **Step 3: Implement the selection-state helper module**

```ts
export type ReaderTokenSelection = {
  sentenceId: string;
  sentenceText: string;
  tokens: string[];
  startWordIndex: number;
  endWordIndex: number;
  selectedText: string;
};

export function createWordSelection(...) { ... }
export function expandSelectionLeft(...) { ... }
export function expandSelectionRight(...) { ... }
export function collapseSelectionToWord(...) { ... }
export function selectionToExplainText(...) { ... }
```

Implementation notes:
- Store inclusive word indexes.
- Only expand to contiguous neighboring English words.
- Derive `selectedText` from token slices, not raw DOM selection text.
- Reuse `validateExplainSelection` for final payload validation instead of duplicating rules.

- [ ] **Step 4: Extend explain utils with shared normalization helpers**

Add small helpers to `src/features/reader/reader-explain-utils.ts` only if they simplify selection-to-request conversion; avoid re-embedding UI logic there.

- [ ] **Step 5: Run the focused unit tests**

Run: `pnpm test src/features/reader/reader-selection-state.test.ts src/features/reader/reader-explain-utils.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/reader/reader-selection-state.ts src/features/reader/reader-selection-state.test.ts src/features/reader/reader-explain-utils.ts src/features/reader/reader-explain-utils.test.ts
git commit -m "Make reader selection range explicit and reusable"
```

## Task 2: Replace Hidden Phrase Discovery With a Shared Action Bar

**Files:**
- Create: `src/components/reader/selection-action-bar.tsx`
- Modify: `src/components/reader/article-body.tsx`
- Modify: `src/components/reader/reader-shell.tsx`
- Modify: `src/lib/ui-copy.ts`
- Test: `src/components/reader/article-body.test.tsx`

- [ ] **Step 1: Write failing component tests for explicit word selection and phrase expansion**

Add tests that assert:
- clicking a word selects and highlights it
- an action bar appears with “看这个词”
- clicking “向左扩展” or “向右扩展” expands the selection
- the highlighted selection remains visible until dismissed or explained
- invalid expansion controls are hidden/disabled at sentence boundaries

Example test shape:

```tsx
it('lets the reader expand from a selected word into a phrase', async () => {
  render(<ArticleBody ... />);

  fireEvent.click(screen.getByRole('button', { name: 'clear' }));
  expect(screen.getByText(/看这个词/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /向右扩展/i }));
  expect(screen.getByText(/clear support/i)).toBeInTheDocument();
  expect(onExplainRequest).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the reader component tests to verify failure**

Run: `pnpm test src/components/reader/article-body.test.tsx`

Expected: FAIL because the new action bar and selection behavior do not exist.

- [ ] **Step 3: Build the shared selection action bar component**

`src/components/reader/selection-action-bar.tsx` should:
- accept the current selection text and mode potential
- expose primary actions for “看这个词/讲解短语”
- expose expansion controls for left/right neighboring words
- expose dismiss/reset behavior
- render as a lightweight floating or inline surface, but stay anchored to the reading context

Suggested prop shape:

```ts
type SelectionActionBarProps = {
  selectedText: string;
  canExpandLeft: boolean;
  canExpandRight: boolean;
  onExpandLeft: () => void;
  onExpandRight: () => void;
  onExplainWord: () => void;
  onExplainPhrase: () => void;
  onClear: () => void;
};
```

- [ ] **Step 4: Refactor `article-body.tsx` to emit semantic token clicks instead of directly firing explain**

Implementation notes:
- keep each word as an interactive element
- stop firing `onExplainRequest` directly from bare word click
- instead notify parent of token click / optional desktop native selection fallback
- add stable visual treatment for selected token span
- keep desktop native drag support only as an adapter into the same selection state, not as a separate UX path

- [ ] **Step 5: Move active selection orchestration into `reader-shell.tsx`**

Implementation notes:
- add `activeSelection` state
- convert selected word/span into explain requests only after explicit user action
- preserve existing explain panel logic and caching
- clear selection when the panel closes or the user taps elsewhere

- [ ] **Step 6: Update copy so the rule is taught before failure**

Add or revise copy in `src/lib/ui-copy.ts`:
- inline hint near the article body: “点词即查；再点相邻词可扩成短语”
- action labels for expand left/right, explain word, explain phrase, clear selection
- simplify error copy to fallback cases only

- [ ] **Step 7: Run updated component tests**

Run: `pnpm test src/components/reader/article-body.test.tsx src/components/reader/explain-panel-content.test.tsx`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/reader/selection-action-bar.tsx src/components/reader/article-body.tsx src/components/reader/reader-shell.tsx src/lib/ui-copy.ts src/components/reader/article-body.test.tsx src/components/reader/explain-panel-content.test.tsx
git commit -m "Replace hidden phrase selection with explicit reader actions"
```

## Task 3: Rebuild Mobile Flow Around the Same Mental Model

**Files:**
- Modify: `src/components/reader/mobile-explain-assist.tsx`
- Modify: `src/components/reader/reader-shell.tsx`
- Modify: `src/features/reader/reader-phrase-suggestions.ts`
- Test: `src/features/reader/reader-phrase-suggestions.test.ts`
- Test: `tests/e2e/mobile-reader.spec.ts`

- [ ] **Step 1: Write failing tests for anchored mobile phrase suggestions**

Unit coverage should assert:
- suggestions always include the selected word or selected span
- suggestions never jump to sentence-level phrases unrelated to the selected word position
- fallback windows stay contiguous and local

Example:

```ts
it('keeps mobile phrase suggestions anchored to the selected word', async () => {
  expect(
    getPhraseSuggestionsForWord({
      article,
      sentenceId: 's3',
      sentenceText: 'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
      selectedWord: 'panic',
    }).map((item) => item.text),
  ).not.toContain('main idea');
});
```

- [ ] **Step 2: Run the phrase suggestion tests to verify failure**

Run: `pnpm test src/features/reader/reader-phrase-suggestions.test.ts`

Expected: FAIL because current logic still prioritizes sentence-level phrase matches.

- [ ] **Step 3: Rewrite phrase suggestion logic to stay local**

Implementation notes:
- article phrase matches only count if they contain the selected word/span or overlap the selected indexes
- fallback windows should stay within 1 word to the left / 2 words to the right unless the current span is already expanded
- reasons should explain locality, not abstract article metadata

- [ ] **Step 4: Simplify mobile assist into a presentation of the current explicit selection**

Implementation notes:
- no long-press-first dependency for the primary flow
- if the old bottom sheet remains, it should mirror the shared action bar actions for the selected token/span
- long press can survive only as a convenience alias for “select this word”, not as the only phrase-discovery path

- [ ] **Step 5: Replace mobile E2E with realistic tap-expand-explain behavior**

Update `tests/e2e/mobile-reader.spec.ts` so it covers:
- tap one word
- see anchored action surface
- expand to neighboring word
- request phrase explanation
- confirm the resulting panel reflects the selected phrase

- [ ] **Step 6: Run mobile-focused tests**

Run: `pnpm test src/features/reader/reader-phrase-suggestions.test.ts`

Run: `pnpm playwright test tests/e2e/mobile-reader.spec.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/reader/mobile-explain-assist.tsx src/components/reader/reader-shell.tsx src/features/reader/reader-phrase-suggestions.ts src/features/reader/reader-phrase-suggestions.test.ts tests/e2e/mobile-reader.spec.ts
git commit -m "Anchor mobile reader phrase help to the active selection"
```

## Task 4: Preserve Desktop Compatibility Without Making Native Selection the Product

**Files:**
- Modify: `src/components/reader/article-body.tsx`
- Modify: `tests/e2e/reader-flow.spec.ts`
- Test: `src/components/reader/article-body.test.tsx`

- [ ] **Step 1: Add failing tests for desktop compatibility paths**

Coverage should assert:
- click-select-expand works on desktop
- optional native drag selection, if preserved, hydrates the same explicit selection state
- phrase explanation no longer depends on synthetic `Range` creation in E2E as the primary proof

- [ ] **Step 2: Run the desktop E2E and component tests to verify failure**

Run: `pnpm test src/components/reader/article-body.test.tsx`

Run: `pnpm playwright test tests/e2e/reader-flow.spec.ts --grep "phrase|lookup and save a word"`

Expected: FAIL until the new shared selection model is fully wired.

- [ ] **Step 3: Adapt any remaining mouse-selection code into the shared state**

Implementation notes:
- if desktop native selection remains, use it only to calculate `activeSelection`
- do not dispatch phrase explain immediately on mouseup
- require the same explicit “讲解短语” action after a native drag range is recognized

- [ ] **Step 4: Rewrite desktop E2E to follow real user intent**

Replace the current synthetic-selection proof with a realistic flow:
- click word
- expand right
- click “讲解短语”
- verify panel

Optional extra test:
- drag-select phrase
- see the same action bar appear

- [ ] **Step 5: Run desktop tests**

Run: `pnpm playwright test tests/e2e/reader-flow.spec.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/reader/article-body.tsx src/components/reader/article-body.test.tsx tests/e2e/reader-flow.spec.ts
git commit -m "Make desktop phrase lookup explicit and testable"
```

## Task 5: Final Verification and Cleanup

**Files:**
- Modify: any touched files above only if verification exposes regressions

- [ ] **Step 1: Run the full targeted test matrix**

Run:

```bash
pnpm test src/features/reader/reader-selection-state.test.ts src/features/reader/reader-explain-utils.test.ts src/features/reader/reader-phrase-suggestions.test.ts src/components/reader/article-body.test.tsx src/components/reader/explain-panel-content.test.tsx
pnpm playwright test tests/e2e/reader-flow.spec.ts tests/e2e/mobile-reader.spec.ts
```

Expected: PASS

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

Expected: PASS

- [ ] **Step 3: Do a final code pass for simplicity**

Checklist:
- no duplicate selection math between components and features
- no stale long-press-only copy
- no dead paths referencing the removed primary native-selection flow
- no review-stage reintroduction

- [ ] **Step 4: Commit the final polish if needed**

```bash
git add src/components/reader src/features/reader src/lib/ui-copy.ts tests/e2e
git commit -m "Polish reader selection UX and stabilize verification"
```

## Risks and Guardrails

- The biggest risk is drifting into a larger reader rewrite. Avoid changing stage flow, saved-word storage, explain API routes, or words-page behavior.
- Keep the explain panel contract stable so this plan stays P0/P1 rather than a platform rewrite.
- If anchoring a floating action bar proves too brittle, prefer an inline sentence-local action row over resurrecting hidden gesture-only discovery.
- If long-press remains on mobile, it must become a convenience shortcut layered on top of the explicit selection model, not a separate interaction system.

## Out of Scope

- Reintroducing or redesigning the review stage
- Phrase saving or phrase review surfaces
- New analytics schemas unless the existing reader event model is trivially extendable
- New dependencies

## Definition of Done

- The reader teaches word and phrase lookup through visible controls instead of failure copy.
- A reader can get from “I want to understand this phrase” to a phrase explanation with explicit, local controls on both desktop and mobile.
- Mobile suggestions no longer jump to unrelated sentence phrases.
- Existing explain and save-word behavior still passes regression tests.
