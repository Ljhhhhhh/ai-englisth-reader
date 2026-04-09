import { expect, test } from '@playwright/test';

test('mobile reader opens a bottom word drawer and keeps reading position stable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');

  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await expect(page.getByText(/第 1 段 \/ 共 2 段/i)).toBeVisible();
  await page.getByRole('button', { name: /下一段/i }).click();
  await expect(page.getByText(/第 2 段 \/ 共 2 段/i)).toBeVisible();

  await page.getByRole('button', { name: /^absorbed$/i }).click();
  await expect(page.getByLabel(/移动端单词详情/i)).toBeVisible();
  await page.getByRole('button', { name: /关闭/i }).click();

  await expect(page.getByText(/第 2 段 \/ 共 2 段/i)).toBeVisible();
});

test('mobile reader keeps stage and paragraph after viewport resize', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');

  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /下一段/i }).click();
  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.getByText(/当前阶段：正文/i)).toBeVisible();
  await expect(page.getByText(/第 2 段 \/ 共 2 段/i)).toBeVisible();

  await page.setViewportSize({ width: 412, height: 915 });
  await expect(page.getByText(/当前阶段：正文/i)).toBeVisible();
  await expect(page.getByText(/第 2 段 \/ 共 2 段/i)).toBeVisible();
});

test('mobile reader reaches review without quiz UI', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');

  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /下一段/i }).click();
  await expect(page.getByText(/第 2 段 \/ 共 2 段/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /读完，进入复盘/i })).toBeVisible();
  await page.getByRole('button', { name: /读完，进入复盘/i }).click();

  await expect(page.getByText(/本机阅读复盘/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Submit quiz/i })).toHaveCount(
    0,
  );
});
