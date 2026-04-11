import { expect, test } from '@playwright/test';

test('health endpoint returns the readiness payload', async ({ request }) => {
  const response = await request.get('/api/health');
  const body = await response.json();

  expect([200, 503]).toContain(response.status());
  expect(body).toMatchObject({
    checks: {
      database: expect.stringMatching(/ok|error/),
    },
    ok: expect.any(Boolean),
    service: 'ai-english-read',
    timestamp: expect.any(String),
  });
});
