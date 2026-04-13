Task statement

Implement the approved memory-first display strategy for the reader explain panel and saved-word list.

Desired outcome

The reader explain panel and the saved-word list both prioritize memory support over comprehension completeness, showing only the fields that most improve recall and reuse.

Known facts/evidence

- `ExplainPanelContent` currently shows `meaning`, `contextMeaning`, `explanation`, and `memoryHook` for words; phrases still prioritize `sourceSentence`.
- `ExplainPanelContent` does not currently use `usageExample`, and does not use `phraseType`.
- `WordList` currently shows `meaning`, `memoryHook`, `usageExample`, and `sourceSentence`, but does not surface `contextMeaning`.
- The agreed product direction is that both surfaces should prioritize memory and may intentionally hide lower-value fields.

Constraints

- Keep cognitive load low.
- Do not widen scope into new interaction patterns unless needed.
- Preserve React code quality and existing repo patterns.
- Add or update regression tests before claiming completion.

Unknowns/open questions

- Whether any existing consumer depends on phrase `sourceSentence` staying visible in the reader panel.
- Whether saved-word records always include `contextMeaning` in existing local storage payloads.

Likely codebase touchpoints

- `src/components/reader/explain-panel-content.tsx`
- `src/components/reader/explain-panel-content.test.tsx`
- `src/components/words/word-list.tsx`
- `src/components/words/word-list.test.tsx`
- `src/lib/ui-copy.ts`
