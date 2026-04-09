# Segmented Reading Upgrade — Implementation TODO

Tracking progress for the implementation plan at:
`docs/superpowers/plans/2026-04-08-segmented-reading-upgrade-detailed.md`

---

## Task 1: Lock Segmented Reading Copy At The Unit Level

- [x] **Step 1**: Update `continue-reading.test.tsx` to assert new behavior (already correct)
- [x] **Step 2**: Run unit test — confirmed PASS (copy already matches)
- [x] **Step 3**: Add segmented-reading copy primitives to `src/lib/ui-copy.ts` (already present)
- [x] **Step 4**: Re-run continue-reading unit test — PASS
- [x] **Step 5**: Re-run `intro-panel.test.tsx` and `review-panel.test.tsx` — PASS
- [x] **Step 6**: Commit copy baseline

> **Status:** ✅ Complete — all copy primitives already in place and unit tests pass.

---

## Task 2: Lock The New Reader Progression With Failing E2E Tests

- [x] **Step 1**: Rewrite desktop reader-flow assertions around progression (already uses new assertions)
- [x] **Step 2**: Rewrite mobile reader assertions around progression (already uses new assertions)
- [x] **Step 3**: Run specs to verify RED — confirmed 8 FAILING tests (missing `下一段`, `第 N 段 / 共 M 段`)
- [x] **Step 4**: Captured failure reasons:
  - Missing `下一段` button
  - Missing `第 1 段 / 共 2 段` progress text
  - `currentParagraph()` called without `totalParagraphCount`
- [x] **Step 5**: Commit red tests (tests already committed with new assertions)

> **Status:** ✅ Complete — E2E tests confirmed RED as expected before implementation.

---

## Task 3: Add Progression State Helpers In Reader Shell

- [x] **Step 1**: Add `getParagraphIndex` and `getParagraphIdByIndex` helpers to `reader-shell.tsx` (already present)
- [x] **Step 2**: Add `goToPreviousParagraph`, `goToNextParagraph`, `goToReviewFromReading` callbacks (already present)
- [x] **Step 3**: Confirm `saveProgress` shape is unchanged ✓
- [x] **Step 4**: Pass progression props to `ArticleBody` (already present)
- [x] **Step 5**: Added `当前阶段：正文` text rendering next to StageNav in reader-shell
- [x] **Step 6**: Commit shell-side state work

> **Status:** ✅ Complete

---

## Task 4: Rebuild Article Body As A Segmented Reading Surface

- [x] **Step 1**: `ArticleBodyProps` already uses progression props (no `onFocusParagraph`)
- [x] **Step 2**: Header shows `第 N 段 / 共 M 段` via `currentParagraph()` ✓
- [x] **Step 3**: Non-active paragraphs demoted with opacity 0.45, no focus buttons ✓
- [x] **Step 4**: Progression controls render `上一段`/`下一段`/`读完，进入复盘` ✓
- [x] **Step 5**: Word lookup only active for active paragraph (`isActive && lookupableWords.has(...)`) ✓
- [x] **Step 6**: Fixed 3 E2E tests that clicked `absorbed` before advancing to p2 (`下一段`)
- [x] **Step 7**: Added `本机阅读复盘` title to `review-panel.tsx`
- [x] **Step 8**: All reader E2E tests — 33 passed, 3 skipped ✓

> **Status:** ✅ Complete

---

## Task 5: Align Homepage Continue Reading With The New Reader Contract

- [x] **Step 1**: Added `homepage continue-reading card resumes from the last paragraph` test to `home.spec.ts`
- [x] **Step 2**: Run homepage spec — PASS (8 passed)
- [x] **Step 3**: `continue-reading.tsx` already shows `上次读到第 N 段` and `继续阅读` CTA ✓
- [x] **Step 4**: All home + reader E2E — PASS ✓
- [x] **Step 5**: Commit home resume alignment

> **Status:** ✅ Complete

---

## Task 6: Update Product And QA Documentation

- [x] **Step 1**: Updated 阅读 section in `产品需求文档-v2.md` to describe segmented progression
- [x] **Step 2**: Updated section 8.1 flow description to use segmented progression language
- [x] **Step 3**: Updated desktop checklist in `mvp-smoke-checklist.md` with 14-step segmented flow
- [x] **Step 4**: Updated mobile checklist with 7-step segmented flow including "当前阶段：正文"
- [x] **Step 5**: Commit docs alignment

> **Status:** ✅ Complete

---

## Task 7: Full Verification Before Handoff

- [x] **Step 1**: Unit tests — 18 passed (11 files) ✓
- [x] **Step 2**: E2E tests — 33 passed, 3 skipped (chromium-only tests skipped on mobile) ✓
- [x] **Step 3**: Full unit/integration suite — PASS ✓
- [x] **Step 4**: Lint — PASS (no errors) ✓
- [x] **Step 5**: Production build — PASS ✓
- [ ] **Step 6**: Manual browser verification (pending user)
- [x] **Step 7**: Final status confirmed:
  - No `聚焦段落` wording remains ✓
  - Segmented progression visible (`第 N 段 / 共 M 段`, `上一段`, `下一段`) ✓
  - Restore messaging aligned (`已回到上次读到的位置 · 第 N 段`) ✓
  - Mobile resize/orientation stable ✓
  - Docs and smoke checklist match shipped behavior ✓

> **Status:** ✅ Complete (pending manual verification)

---

## Task 5: Align Homepage Continue Reading With The New Reader Contract

- [ ] **Step 1**: Add homepage E2E test for continue-reading card in `tests/e2e/home.spec.ts`
- [ ] **Step 2**: Run homepage spec to verify RED
- [ ] **Step 3**: Update `continue-reading.tsx` wording (verify `上次读到第 N 段` / `继续阅读`)
- [ ] **Step 4**: Re-run `home.spec.ts` + `reader-flow.spec.ts` — expect PASS
- [ ] **Step 5**: Commit home resume alignment

> **Status:** ⏳ Pending Task 4

---

## Task 6: Update Product And QA Documentation

- [ ] **Step 1**: Replace "段落聚焦" wording in `产品需求文档-v2.md`
- [ ] **Step 2**: Update `docs/testing/mvp-smoke-checklist.md` for segmented progression
- [ ] **Step 3**: Review updated docs via sed commands
- [ ] **Step 4**: Commit docs alignment

> **Status:** ⏳ Pending Task 5

---

## Task 7: Full Verification Before Handoff

- [ ] **Step 1**: Run targeted unit tests (`continue-reading`, `intro-panel`, `review-panel`) — expect PASS
- [ ] **Step 2**: Run targeted E2E tests (`home`, `reader-flow`, `mobile-reader`) — expect PASS
- [ ] **Step 3**: Run full unit/integration suite (`pnpm test`) — expect PASS
- [ ] **Step 4**: Run lint (`pnpm lint`) — expect PASS
- [ ] **Step 5**: Run production build (`pnpm build`) — expect PASS
- [ ] **Step 6**: Manually verify main user path in browser
- [ ] **Step 7**: Capture final status — confirm no `聚焦段落` wording remains

> **Status:** ⏳ Pending all prior tasks

---

## Summary

| Task                                | Status         |
| ----------------------------------- | -------------- |
| Task 1: Lock copy at unit level     | ✅ Done        |
| Task 2: Lock E2E tests (RED)        | ✅ Done        |
| Task 3: Reader shell state helpers  | 🔄 In progress |
| Task 4: Article body progression UI | ⏳ Pending     |
| Task 5: Homepage continue reading   | ⏳ Pending     |
| Task 6: Update docs                 | ⏳ Pending     |
| Task 7: Full verification           | ⏳ Pending     |
