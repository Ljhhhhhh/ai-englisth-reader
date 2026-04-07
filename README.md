# AI English Read

Phase 1 MVP for interactive English deep reading. The app keeps learners inside one article, supports inline word lookup, saves vocabulary on the same device, runs a short comprehension quiz, and unlocks review after submission.

## What ships in the MVP

- Homepage article list and continue-reading block
- Four-stage reader flow: intro, read, quiz, review
- Same-device progress restore via local storage
- Inline word lookup and saved words page
- Quiz submission with explanations and review unlock
- Learning event capture for core reading actions
- Desktop and mobile Playwright coverage for the main loop

## Local setup

1. Install dependencies.

```bash
pnpm install
```

2. Create the local environment file.

```bash
cp .env.example .env
```

3. Optional: prepare Prisma locally if you want the SQLite schema and seed to stay aligned with the project plan.

```bash
pnpm db:push
pnpm db:seed
```

4. Start the app.

```bash
pnpm dev
```

Open http://127.0.0.1:3000.

## Commands

- Dev server: `pnpm dev`
- Production build: `pnpm build`
- Lint: `pnpm lint`
- Unit tests: `pnpm test`
- E2E tests: `pnpm test:e2e`
- Prisma push: `pnpm db:push`
- Prisma seed: `pnpm db:seed`

## Data model notes

- Reader content currently comes from `content/articles/*.json` and is validated through Zod.
- Reader progress, saved words, quiz attempts, and learning events are persisted on the same device in local storage for the MVP.
- Prisma schema currently targets a local SQLite file for lightweight development setup, while the Phase 1 UI still runs on local JSON content plus same-device persistence.

## MVP smoke flow

Use the manual checklist in [docs/testing/mvp-smoke-checklist.md](docs/testing/mvp-smoke-checklist.md) before calling the MVP ready for trial.
