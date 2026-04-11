import { expect, test } from '@playwright/test';

test('health endpoint returns the readiness payload', async ({ request }) => {
  const response = await request.get('/api/health');
  const body = await response.json();

  expect([200, 503]).toContain(response.status());
  expect(body).toMatchObject({
    checkedAt: expect.any(String),
    status: expect.stringMatching(/ok|error/),
    checks: {
      database: {
        ok: expect.any(Boolean),
        detail: expect.any(String),
      },
      environment: {
        ok: expect.any(Boolean),
        missing: expect.any(Array),
      },
      llm: {
        configured: expect.any(Boolean),
        detail: expect.any(String),
      },
    },
  });
});
