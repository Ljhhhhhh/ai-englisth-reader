# Context Snapshot

- task statement: Change the project to private-access mode using middleware so unauthenticated users can only access /login and auth endpoints.
- desired outcome: All app pages require login; unauthenticated page requests redirect to /login?next=<path>; authenticated /login visits redirect back to next or /; login completion also returns to next.
- known facts/evidence: Existing email-code auth, session cookie JWT verification in src/features/auth/session.ts, getCurrentUser() exists, no middleware.ts exists, generate page already has client-side login gating, user approved approach 1.
- constraints: Minimal diff, preserve existing auth APIs, use tests first, verify before completion, no new dependencies.
- unknowns/open questions: Whether /api/health remains public; keeping public for operational health checks unless tests show otherwise.
- likely codebase touchpoints: middleware.ts, src/app/login/page.tsx, auth/session helpers, tests around middleware/login.
