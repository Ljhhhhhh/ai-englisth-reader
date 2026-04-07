# MVP Smoke Checklist

Run the app locally with `pnpm dev`, then verify the following on both desktop and mobile-width viewports.

## Setup

- Install dependencies with `pnpm install`
- Create `.env` from `.env.example`
- Optional Prisma alignment: `pnpm db:push && pnpm db:seed`
- Start the app with `pnpm dev`

## Desktop smoke flow

1. Open `/` and confirm article cards render.
2. Open one article and confirm the intro stage appears.
3. Start reading, jump paragraphs, refresh, and confirm reading position restores.
4. Tap a highlighted word and confirm the desktop side panel stays visible without losing the paragraph position.
5. Save a word and confirm the button switches to the saved state.
6. Continue to the review stage and confirm the full translation appears without any quiz gate.
7. Use the reader navigation to jump to the next article, then return to the homepage or saved words page.
8. Open `/words` and confirm the saved word appears under the correct article.

## Mobile smoke flow

1. Open `/` in a mobile viewport and confirm the homepage remains usable.
2. Open an article and start reading.
3. Tap a highlighted word and confirm the bottom drawer opens.
4. Close the drawer and confirm the current paragraph is unchanged.
5. Rotate or resize the viewport and confirm the current stage and paragraph remain intact.
6. Continue to the review stage and confirm it remains readable on mobile without any quiz UI.

## Edge-state checks

1. Visit `/?mockEmptyArticles=1` and confirm the empty article state explains how to recover.
2. Visit `/reader/unknown-slug` and confirm a clear not-found state appears.
3. Visit `/reader/welcome-to-deep-reading?mockLookupError=once` and confirm the retry flow for lookup works.
4. Visit `/reader/welcome-to-deep-reading?mockSaveWordError=once` and confirm saved-word retry feedback works.
5. Visit `/reader/welcome-to-deep-reading?mockProgressSaveError=once` and confirm reading stays on screen and the warning disappears after the next interaction.
6. Visit `/reader/welcome-to-deep-reading?mockMissingTranslation=1` and confirm a content fallback appears.
7. Visit `/reader/welcome-to-deep-reading?mockBrokenReferences=1` and confirm a content fallback appears.
8. Visit `/words` with no saved words and confirm the page encourages reading first.
