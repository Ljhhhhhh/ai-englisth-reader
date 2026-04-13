# Generate Upload Module Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the generate page file-upload module into a study-room style upload tray without changing submission behavior.

**Architecture:** Keep all behavior in the existing `GeneratePage` component. Adjust tests first for the new file-mode UI, then implement the redesigned tray and minimal supporting state presentation in the same page file.

**Tech Stack:** Next.js App Router, React 19, inline styles, Vitest, Testing Library

---

### Task 1: Lock the revised upload UX in tests

**Files:**
- Modify: `src/app/generate/page.test.tsx`

- [ ] Add a test that switches to file mode and asserts the new upload tray copy is rendered.
- [ ] Add a test that selects a file and asserts the chosen file name appears in the confirmation area.
- [ ] Run the targeted generate page test file and confirm the new assertions fail before implementation.

### Task 2: Implement the upload tray redesign

**Files:**
- Modify: `src/app/generate/page.tsx`

- [ ] Replace the plain file input presentation with a large labeled upload tray.
- [ ] Add layered study-room styling, clearer format chips, and selected-file status copy.
- [ ] Keep existing submission logic unchanged and preserve the URL mode behavior.

### Task 3: Verify the page

**Files:**
- Modify: `src/app/generate/page.tsx`
- Modify: `src/app/generate/page.test.tsx`

- [ ] Run `pnpm test src/app/generate/page.test.tsx` and confirm the page tests pass.
- [ ] Run `pnpm lint` and confirm there are no lint errors from this change.
