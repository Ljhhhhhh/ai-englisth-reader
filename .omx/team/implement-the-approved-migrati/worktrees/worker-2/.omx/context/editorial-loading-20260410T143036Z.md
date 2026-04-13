## Task Statement

Design and implement a better waiting animation for LLM-triggered article generation and word or phrase explanation.

## Desired Outcome

Ship a unified loading experience that feels like an editor preparing annotated reading material, not a generic spinner. The solution should cover the reader explain panel, selection trigger buttons, and the generate article flow.

## Known Facts / Evidence

- Reader explanations currently render a plain loading text block in `src/components/reader/explain-panel-content.tsx`.
- Reader requests are initiated in `src/components/reader/reader-shell.tsx` and can be in `loading`, `error`, or `success`.
- Word or phrase trigger buttons live in `src/components/reader/selection-action-bar.tsx`, rendered from `src/components/reader/article-body.tsx`.
- Article generation status lives in `src/app/generate/page.tsx` with `pending`, `processing`, `done`, and `failed`.
- Global visual tokens are centralized in `src/app/globals.css`.
- Copy is centralized in `src/lib/ui-copy.ts`.

## Constraints

- Use the approved "path 2": a unified reusable loading component layer.
- Visual direction is "editorial" / "编辑感".
- Interaction level is "强化", but the effect should stay local to cards or panels rather than becoming a full-page overlay.
- Respect `prefers-reduced-motion` and degrade to static skeletons.
- No new dependencies.

## Unknowns / Open Questions

- Exact copy and step labels still need to be introduced in `ui-copy`.
- Existing tests for loading states are thin, so targeted regression coverage will likely need to be added.

## Likely Codebase Touchpoints

- `src/components/system/*`
- `src/components/reader/explain-panel-content.tsx`
- `src/components/reader/selection-action-bar.tsx`
- `src/components/reader/article-body.tsx`
- `src/components/reader/reader-shell.tsx`
- `src/app/generate/page.tsx`
- `src/app/globals.css`
- `src/lib/ui-copy.ts`
- Related tests in `src/components/reader/*.test.tsx` and `src/app/generate/page.test.tsx`
