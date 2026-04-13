# Segmented Reading Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the article reading flow from visible paragraph focusing controls to a segmented reading flow that guides the learner through one paragraph at a time while preserving resume behavior.

**Architecture:** Keep the existing paragraph-based progress model, but change the reader UI and copy so the active paragraph becomes the primary reading unit with previous/next progression controls. Update supporting home/resume copy, tests, and docs so the whole product speaks the same segmented-reading language.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Playwright

---

### Task 1: Lock New Reader Copy Expectations

**Files:**

- Modify: `src/lib/ui-copy.ts`
- Test: `src/components/home/continue-reading.test.tsx`
- Test: `src/components/reader/intro-panel.test.tsx`
- Test: `src/components/reader/review-panel.test.tsx`

- [ ] **Step 1: Write a failing component test for the new resume language**

Add or update a test in `src/components/home/continue-reading.test.tsx` that expects resume copy like “上次读到第 1 段” and a CTA aligned with continuing reading instead of generic progress wording.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/components/home/continue-reading.test.tsx`
Expected: FAIL because current copy still uses the old wording.

- [ ] **Step 3: Update shared copy for segmented reading**

Modify `src/lib/ui-copy.ts` so reader and continue-reading copy support:

- current paragraph progress like `第 N 段 / 共 M 段`
- resume copy like `上次读到第 N 段`
- restore copy like `已回到上次读到的位置 · 第 N 段`
- action labels like `上一段`, `下一段`, `读完，进入复盘`

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `pnpm test src/components/home/continue-reading.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the other copy-adjacent component tests**

Run: `pnpm test src/components/reader/intro-panel.test.tsx src/components/reader/review-panel.test.tsx`
Expected: PASS or unchanged PASS after copy updates.

### Task 2: Convert Reader Body Into Segmented Progression

**Files:**

- Modify: `src/components/reader/article-body.tsx`
- Modify: `src/components/reader/reader-shell.tsx`
- Test: `tests/e2e/reader-flow.spec.ts`
- Test: `tests/e2e/mobile-reader.spec.ts`

- [ ] **Step 1: Write a failing end-to-end test for previous/next paragraph progression**

Update `tests/e2e/reader-flow.spec.ts` and `tests/e2e/mobile-reader.spec.ts` so they assert:

- the reader shows current paragraph progress with total count
- the user advances with `下一段`
- the user can return with `上一段`
- the last paragraph leads to `读完，进入复盘`
- on mobile, resizing/rotating still preserves the current stage and current paragraph progress

- [ ] **Step 2: Run the affected end-to-end tests to verify they fail**

Run: `pnpm test:e2e tests/e2e/reader-flow.spec.ts tests/e2e/mobile-reader.spec.ts`
Expected: FAIL because old controls still say `聚焦第 N 段` and lack progression behavior.

- [ ] **Step 3: Implement segmented paragraph state and controls**

Modify `src/components/reader/reader-shell.tsx` to derive the active paragraph index from the saved paragraph id and expose explicit previous/next handlers. Modify `src/components/reader/article-body.tsx` so:

- it renders one clear active paragraph state
- it shows paragraph progress and total count
- it uses progression controls instead of per-paragraph focus buttons
- it still supports word lookup inside the active paragraph context
- it sends the user to review from the last paragraph

- [ ] **Step 4: Run the affected end-to-end tests to verify they pass**

Run: `pnpm test:e2e tests/e2e/reader-flow.spec.ts tests/e2e/mobile-reader.spec.ts`
Expected: PASS

- [ ] **Step 5: Run focused unit tests for reader components if present**

Run: `pnpm test src/components/reader`
Expected: PASS for reader component/unit coverage that exists in this directory.

### Task 3: Align Continue Reading And Restore Messaging

**Files:**

- Modify: `src/components/home/continue-reading.tsx`
- Modify: `src/components/reader/reader-shell.tsx`
- Modify: `src/lib/ui-copy.ts`
- Test: `tests/e2e/home.spec.ts`
- Test: `tests/e2e/reader-flow.spec.ts`

- [ ] **Step 1: Write a failing test for home-page continue reading wording**

Update `tests/e2e/home.spec.ts` so it checks for segmented-reading copy such as “上次读到第 N 段” and a continue CTA aligned with the new flow. Also add a full-flow assertion that after generating reading progress, clicking the home-page continue-reading entry returns the user to the same article and paragraph.

- [ ] **Step 2: Run the targeted home test to verify it fails**

Run: `pnpm test:e2e tests/e2e/home.spec.ts`
Expected: FAIL because the home card still uses the old resume phrasing.

- [ ] **Step 3: Implement unified resume and restore messaging**

Update `src/components/home/continue-reading.tsx` and `src/components/reader/reader-shell.tsx` to present the saved stage/paragraph as a continuation experience, not a raw state restore. Preserve the existing storage behavior.

- [ ] **Step 4: Run the updated home and reader end-to-end tests**

Run: `pnpm test:e2e tests/e2e/home.spec.ts tests/e2e/reader-flow.spec.ts`
Expected: PASS

### Task 4: Update Docs And Manual Verification Checklist

**Files:**

- Modify: `产品需求文档-v2.md`
- Modify: `docs/testing/mvp-smoke-checklist.md`

- [ ] **Step 1: Update product documentation wording**

Revise `产品需求文档-v2.md` so the reading section and relevant acceptance points describe segmented reading progression rather than paragraph focusing.

- [ ] **Step 2: Update the smoke checklist**

Revise `docs/testing/mvp-smoke-checklist.md` so manual QA checks previous/next paragraph progression, resume continuity, and “continue reading” wording.

- [ ] **Step 3: Review the changed docs for consistency**

Run: `sed -n '130,260p' 产品需求文档-v2.md && sed -n '1,120p' docs/testing/mvp-smoke-checklist.md`
Expected: wording consistently reflects segmented reading.

### Task 5: Full Verification

**Files:**

- Modify: `tests/e2e/reader-flow.spec.ts`
- Modify: `tests/e2e/mobile-reader.spec.ts`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `src/components/home/continue-reading.tsx`
- Modify: `src/components/reader/article-body.tsx`
- Modify: `src/components/reader/reader-shell.tsx`
- Modify: `src/lib/ui-copy.ts`
- Modify: `产品需求文档-v2.md`
- Modify: `docs/testing/mvp-smoke-checklist.md`

- [ ] **Step 1: Run targeted unit tests**

Run: `pnpm test src/components/home/continue-reading.test.tsx src/components/reader/intro-panel.test.tsx src/components/reader/review-panel.test.tsx`
Expected: PASS

- [ ] **Step 2: Run targeted end-to-end coverage**

Run: `pnpm test:e2e tests/e2e/home.spec.ts tests/e2e/reader-flow.spec.ts tests/e2e/mobile-reader.spec.ts`
Expected: PASS

- [ ] **Step 3: Run the full project test suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 4: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 5: Run a production build**

Run: `pnpm build`
Expected: PASS
