# Server migration smoke checklist

Use this after the auth/MySQL/UI migration lanes converge on the same branch or deployment.

## Preconditions

- The target environment is running the Docker image from this repo.
- Prisma migrations have been applied.
- Bundled article import/seed has completed.
- The deployment exposes `/api/health` and returns `status: ok`.
- A test mailbox or verification-code capture path exists for login.

## Automated gate before manual smoke

Run all of the following on the merged migration branch:

```bash
pnpm lint
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm prisma validate
pnpm test:e2e
```

## Manual smoke path

1. Open `/api/health` and confirm database readiness is `ok`.
2. Open `/` and confirm article cards render.
3. Request a login verification code.
4. Verify the code and land on the authenticated homepage.
5. Open a seeded article in `/reader/<slug>`.
6. Progress at least one paragraph and refresh the page.
7. Confirm continue-reading restores the same article and position.
8. Save a word from the reader and confirm the saved state updates.
9. Open `/words` and confirm the word is grouped under the current article.
10. Submit a generation request.
11. Poll until the generation job becomes `done`.
12. Open the generated article and confirm it is visible to the same user.
13. Log in as a different user and confirm the generated article/job is not accessible.

## Operational checks

- Review app logs for auth verification failures.
- Review app logs for generation jobs stuck in `pending` or `processing`.
- Confirm there are no runtime reads from filesystem article content for generated articles.
- Confirm there are no runtime dependencies on `localStorage` or anonymous `deviceId` state for launch-critical flows.
