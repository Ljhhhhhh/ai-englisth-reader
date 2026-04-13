# Segmented Reading Upgrade Detailed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the reader from a paragraph-focusing UI into a segmented reading flow that guides users paragraph by paragraph while keeping resume, lookup, and cross-device-state-on-same-device behavior intact.

**Architecture:** Keep the existing persisted `paragraphId` model and the current three-stage reader shell. Rebuild only the reading-stage interaction model: the shell should derive an active paragraph index from saved state, the article body should render a single clear active reading target with previous/next progression controls, and the home/resume copy plus docs/tests should all speak the same “continue reading from here” language.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Playwright

---

## File Structure And Responsibilities

- `src/lib/ui-copy.ts`
  Owns all reader, resume, and progression wording. This file should contain the new segmented-reading labels and helper formatters.

- `src/components/reader/reader-shell.tsx`
  Owns reader stage state, persisted `paragraphId`, resume handling, and the callbacks passed to the reading-stage body.

- `src/components/reader/article-body.tsx`
  Owns reading-stage presentation. This is where the current paragraph should become the primary reading unit and the previous/next controls should live.

- `src/components/home/continue-reading.tsx`
  Owns the homepage “continue reading” card and its user-facing resume wording.

- `src/components/home/continue-reading.test.tsx`
  Unit-level protection for the home resume card wording and link target.

- `tests/e2e/reader-flow.spec.ts`
  Desktop-oriented end-to-end contract for reader progression, resume, lookup, save-word, and review handoff behavior.

- `tests/e2e/mobile-reader.spec.ts`
  Mobile-oriented end-to-end contract for progression plus viewport/orientation stability.

- `tests/e2e/home.spec.ts`
  End-to-end contract for homepage continue-reading wording and entry behavior.

- `产品需求文档-v2.md`
  Product language source of truth. Must describe the reading stage as segmented progression instead of paragraph focusing.

- `docs/testing/mvp-smoke-checklist.md`
  Manual QA checklist. Must verify progression and resume continuity using the new interaction model.

---

### Task 1: Lock Segmented Reading Copy At The Unit Level

**Files:**

- Modify: `src/lib/ui-copy.ts`
- Modify: `src/components/home/continue-reading.test.tsx`
- Test: `src/components/reader/intro-panel.test.tsx`
- Test: `src/components/reader/review-panel.test.tsx`

- [ ] **Step 1: Update the continue-reading unit test to express the new behavior**

Edit `src/components/home/continue-reading.test.tsx` so it asserts all of the following:

- resume text contains `上次读到第 1 段`
- the CTA label is `继续阅读`
- the CTA target is `/reader/welcome-to-deep-reading`

- [ ] **Step 2: Run the single unit test and confirm it fails for the old wording**

Run: `pnpm test src/components/home/continue-reading.test.tsx`
Expected: FAIL because the old copy or link expectations do not match yet.

- [ ] **Step 3: Add segmented-reading copy primitives**

Update `src/lib/ui-copy.ts` to provide:

- `formatParagraphProgress(paragraphId, totalParagraphCount)` returning `第 N 段 / 共 M 段`
- `reader.articleBody.previousParagraph = '上一段'`
- `reader.articleBody.nextParagraph = '下一段'`
- `reader.articleBody.continueToReview = '读完，进入复盘'`
- `reader.progress.restoreReady = '已回到上次读到的位置 · 第 N 段'`
- `continueReading.button = '继续阅读'`
- `continueReading.resumeFrom = '上次读到第 N 段'`

- [ ] **Step 4: Re-run the continue-reading unit test**

Run: `pnpm test src/components/home/continue-reading.test.tsx`
Expected: PASS

- [ ] **Step 5: Re-run the nearby reader component tests to catch accidental copy regressions**

Run: `pnpm test src/components/reader/intro-panel.test.tsx src/components/reader/review-panel.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit the copy baseline**

Run:

```bash
git add src/lib/ui-copy.ts src/components/home/continue-reading.test.tsx
git commit -m "test: lock segmented reading copy"
```

Expected: commit succeeds with only Task 1 files staged.

### Task 2: Lock The New Reader Progression With Failing E2E Tests

**Files:**

- Modify: `tests/e2e/reader-flow.spec.ts`
- Modify: `tests/e2e/mobile-reader.spec.ts`

- [ ] **Step 1: Rewrite desktop reader-flow assertions around progression instead of focusing**

In `tests/e2e/reader-flow.spec.ts`, replace old “聚焦第 N 段” expectations with assertions for:

- initial progress text `第 1 段 / 共 2 段`
- advancing with `下一段`
- seeing `上一段` on the second paragraph
- resuming after reload on `第 2 段 / 共 2 段`
- final action `读完，进入复盘`

- [ ] **Step 2: Rewrite mobile reader assertions around progression and viewport stability**

In `tests/e2e/mobile-reader.spec.ts`, assert:

- mobile starts on `第 1 段 / 共 2 段`
- `下一段` advances to `第 2 段 / 共 2 段`
- opening/closing the mobile word drawer preserves that progress
- resizing to landscape and back preserves `当前阶段：正文` and `第 2 段 / 共 2 段`
- the last paragraph shows `读完，进入复盘`

- [ ] **Step 3: Run the desktop and mobile reader specs to verify RED**

Run: `pnpm test:e2e tests/e2e/reader-flow.spec.ts tests/e2e/mobile-reader.spec.ts`
Expected: FAIL because the current UI still relies on paragraph focus buttons and does not yet satisfy the new progression contract.

- [ ] **Step 4: Keep the failing output note in the task log**

Capture the failure reason before implementation:

- missing `下一段`
- old `聚焦第 N 段` controls still visible
- restore copy mismatch if still present

- [ ] **Step 5: Commit the red tests**

Run:

```bash
git add tests/e2e/reader-flow.spec.ts tests/e2e/mobile-reader.spec.ts
git commit -m "test: define segmented reading flow"
```

Expected: commit succeeds with failing tests intentionally recorded on the feature branch.

### Task 3: Add Progression State Helpers In Reader Shell

**Files:**

- Modify: `src/components/reader/reader-shell.tsx`
- Test: `tests/e2e/reader-flow.spec.ts`
- Test: `tests/e2e/mobile-reader.spec.ts`

- [ ] **Step 1: Add paragraph index derivation helpers**

Inside `src/components/reader/reader-shell.tsx`, add focused helpers such as:

- `getParagraphIndex(article, paragraphId): number`
- `getParagraphIdByIndex(article, index): string | undefined`
- derived values for `currentParagraphIndex`, `totalParagraphCount`, `isFirstParagraph`, `isLastParagraph`

- [ ] **Step 2: Add explicit progression callbacks**

Implement shell callbacks:

- `goToPreviousParagraph()`
- `goToNextParagraph()`
- `goToReviewFromReading()`

Behavior:

- `goToPreviousParagraph()` moves to the previous paragraph only when available
- `goToNextParagraph()` moves to the next paragraph only when available
- `goToReviewFromReading()` changes stage to `review` and keeps the saved last paragraph

- [ ] **Step 3: Keep saved progress logic unchanged at the storage boundary**

Do not change the shape passed into `saveProgress`; continue persisting:

- `articleSlug`
- `deviceId`
- `currentStage`
- `paragraphId`

The change here is only how the shell computes and advances paragraph state.

- [ ] **Step 4: Pass progression props to `ArticleBody`**

Update the `ArticleBody` call site so it receives:

- `activeParagraphId`
- `activeParagraphIndex`
- `totalParagraphCount`
- `canGoPrevious`
- `canGoNext`
- `onPreviousParagraph`
- `onNextParagraph`
- `onContinueToReview`

- [ ] **Step 5: Run the reader specs to see what still fails**

Run: `pnpm test:e2e tests/e2e/reader-flow.spec.ts tests/e2e/mobile-reader.spec.ts`
Expected: still FAIL, but now for presentation-layer reasons rather than missing shell state transitions.

- [ ] **Step 6: Commit the shell-side state work**

Run:

```bash
git add src/components/reader/reader-shell.tsx
git commit -m "feat: add segmented reader shell state"
```

Expected: commit succeeds with only shell-state changes staged.

### Task 4: Rebuild Article Body As A Segmented Reading Surface

**Files:**

- Modify: `src/components/reader/article-body.tsx`
- Modify: `src/lib/ui-copy.ts`
- Test: `tests/e2e/reader-flow.spec.ts`
- Test: `tests/e2e/mobile-reader.spec.ts`

- [ ] **Step 1: Expand `ArticleBodyProps` for progression**

Replace the old `onFocusParagraph` contract with explicit progression props:

- `activeParagraphIndex`
- `totalParagraphCount`
- `canGoPrevious`
- `canGoNext`
- `onPreviousParagraph`
- `onNextParagraph`

- [ ] **Step 2: Change the header from paragraph label to paragraph progress**

Render the header progress using:

```ts
uiCopy.reader.articleBody.currentParagraph(
  activeParagraphId ?? article.paragraphs[0]?.id,
  totalParagraphCount,
);
```

Expected visible text: `第 1 段 / 共 2 段`

- [ ] **Step 3: Demote non-active paragraphs and remove focus buttons**

For each paragraph card:

- keep the active one visually emphasized
- keep non-active cards visibly quieter
- remove the old `聚焦第 N 段` button
- do not introduce a new directory panel in this task

- [ ] **Step 4: Add progression controls at the bottom of the reading stage**

Render:

- `上一段` button when `canGoPrevious` is true
- `下一段` button when `canGoNext` is true
- `读完，进入复盘` button when `canGoNext` is false

Example rendering shape:

```tsx
{
  canGoPrevious ? <button type="button">上一段</button> : null;
}
{
  canGoNext ? (
    <button type="button">下一段</button>
  ) : (
    <button type="button">读完，进入复盘</button>
  );
}
```

- [ ] **Step 5: Keep word lookup behavior inside the currently active reading context**

Do not remove word lookup buttons from the active paragraph text. Non-active paragraphs may still render text, but lookup must remain functional for the active reading unit and must not break the selected paragraph state.

- [ ] **Step 6: Run the reader specs again**

Run: `pnpm test:e2e tests/e2e/reader-flow.spec.ts tests/e2e/mobile-reader.spec.ts`
Expected: PASS

- [ ] **Step 7: Run reader component tests if present**

Run: `pnpm test src/components/reader`
Expected: PASS for the reader-component tests that exist in the repo.

- [ ] **Step 8: Commit the article body progression UI**

Run:

```bash
git add src/components/reader/article-body.tsx src/components/reader/reader-shell.tsx src/lib/ui-copy.ts
git commit -m "feat: convert reader to segmented progression"
```

Expected: commit succeeds with the reader-stage UI changes.

### Task 5: Align Homepage Continue Reading With The New Reader Contract

**Files:**

- Modify: `src/components/home/continue-reading.tsx`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `tests/e2e/reader-flow.spec.ts`
- Modify: `src/lib/ui-copy.ts`

- [ ] **Step 1: Add a homepage end-to-end test for the continue-reading card**

In `tests/e2e/home.spec.ts`, create a flow that:

- opens `/reader/welcome-to-deep-reading`
- enters reading
- advances to paragraph 2
- returns to `/`
- asserts the home card shows `上次读到第 2 段`
- clicks `继续阅读`
- verifies the browser returns to `/reader/welcome-to-deep-reading`
- verifies the reader shows `第 2 段 / 共 2 段`

- [ ] **Step 2: Run the homepage spec to verify RED if the card is not aligned yet**

Run: `pnpm test:e2e tests/e2e/home.spec.ts`
Expected: FAIL if the wording or route-entry expectations are still stale.

- [ ] **Step 3: Simplify the continue-reading card wording**

Update `src/components/home/continue-reading.tsx` so the card emphasizes:

- article title
- `上次读到第 N 段`
- CTA `继续阅读`

Do not add new visual structure beyond what the current card already needs.

- [ ] **Step 4: Re-run homepage plus reader restore coverage**

Run: `pnpm test:e2e tests/e2e/home.spec.ts tests/e2e/reader-flow.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit the home resume alignment**

Run:

```bash
git add src/components/home/continue-reading.tsx tests/e2e/home.spec.ts tests/e2e/reader-flow.spec.ts
git commit -m "feat: align continue reading with segmented flow"
```

Expected: commit succeeds with home + resume-path coverage.

### Task 6: Update Product And QA Documentation

**Files:**

- Modify: `产品需求文档-v2.md`
- Modify: `docs/testing/mvp-smoke-checklist.md`

- [ ] **Step 1: Replace “段落聚焦” wording in the product doc**

Update the reading-stage description in `产品需求文档-v2.md` so it describes:

- segmented progression by paragraph
- previous/next reading flow
- resume continuity
- mobile orientation stability

- [ ] **Step 2: Update the manual smoke checklist**

Revise `docs/testing/mvp-smoke-checklist.md` so manual QA verifies:

- entering reading starts at paragraph 1
- `下一段` advances correctly
- `上一段` returns correctly
- the last paragraph leads to review
- lookup does not lose the current paragraph
- refreshing preserves the current paragraph
- home continue-reading returns to the same article and paragraph
- mobile viewport changes preserve state

- [ ] **Step 3: Review the updated docs directly**

Run:

```bash
sed -n '130,260p' 产品需求文档-v2.md
sed -n '1,120p' docs/testing/mvp-smoke-checklist.md
```

Expected: all wording consistently matches segmented reading.

- [ ] **Step 4: Commit the docs alignment**

Run:

```bash
git add 产品需求文档-v2.md docs/testing/mvp-smoke-checklist.md
git commit -m "docs: describe segmented reading flow"
```

Expected: commit succeeds with only docs changes staged.

### Task 7: Full Verification Before Handoff

**Files:**

- Verify: `src/lib/ui-copy.ts`
- Verify: `src/components/home/continue-reading.tsx`
- Verify: `src/components/reader/article-body.tsx`
- Verify: `src/components/reader/reader-shell.tsx`
- Verify: `tests/e2e/home.spec.ts`
- Verify: `tests/e2e/reader-flow.spec.ts`
- Verify: `tests/e2e/mobile-reader.spec.ts`
- Verify: `产品需求文档-v2.md`
- Verify: `docs/testing/mvp-smoke-checklist.md`

- [ ] **Step 1: Run the targeted unit tests**

Run: `pnpm test src/components/home/continue-reading.test.tsx src/components/reader/intro-panel.test.tsx src/components/reader/review-panel.test.tsx`
Expected: PASS

- [ ] **Step 2: Run the targeted E2E tests**

Run: `pnpm test:e2e tests/e2e/home.spec.ts tests/e2e/reader-flow.spec.ts tests/e2e/mobile-reader.spec.ts`
Expected: PASS

- [ ] **Step 3: Run the full unit/integration suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 4: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 5: Run a production build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 6: Manually verify the main user path in the browser**

Check this sequence manually:

1. enter article
2. start reading
3. advance to paragraph 2
4. refresh and confirm paragraph 2 remains active
5. open and close word lookup
6. return home and use `继续阅读`
7. confirm the reader resumes on paragraph 2
8. finish the last paragraph and enter review

- [ ] **Step 7: Capture final status**

Before handoff, confirm the implementation satisfies every item in the design doc:

- no primary-path `聚焦段落` wording remains
- segmented progression is visible
- restore messaging is aligned
- mobile resize/orientation is stable
- docs and smoke checklist match the shipped behavior
