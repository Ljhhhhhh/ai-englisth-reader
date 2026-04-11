import { expect, test } from '@playwright/test';

test('health endpoint reports database readiness', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    checks: {
      database: 'ok',
    },
    ok: true,
    service: 'ai-english-read',
    timestamp: expect.any(String),
  });
});
