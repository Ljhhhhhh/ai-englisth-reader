import { expect, test } from '@playwright/test';

test('mobile reader opens a bottom word drawer and keeps reading position stable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');

  await page.goto('/reader/welcome-to-deep-reading');

  await page
    .getByRole('button', { name: /Start reading the article/i })
    .click();
  await page.getByRole('button', { name: /Jump to paragraph 2/i }).click();
  await expect(page.getByText(/Current paragraph: p2/i)).toBeVisible();

  await page.getByRole('button', { name: /^absorbed$/i }).click();
  await expect(page.getByLabel(/Word details mobile/i)).toBeVisible();
  await page.getByRole('button', { name: /Close/i }).click();

  await expect(page.getByText(/Current paragraph: p2/i)).toBeVisible();
});

test('mobile reader keeps stage and paragraph after viewport resize', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');

  await page.goto('/reader/welcome-to-deep-reading');

  await page
    .getByRole('button', { name: /Start reading the article/i })
    .click();
  await page.getByRole('button', { name: /Jump to paragraph 2/i }).click();
  await page.setViewportSize({ width: 915, height: 412 });

  await expect(page.getByText(/Current stage: Read/i)).toBeVisible();
  await expect(page.getByText(/Current paragraph: p2/i)).toBeVisible();
});
