import { expect, test } from '@playwright/test';

test('mobile reader opens a bottom word drawer and keeps stage stable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');

  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await expect(page.getByText(/当前阶段：正文/i)).toBeVisible();

  await page.getByRole('button', { name: /^guided$/i }).click();
  await page.getByRole('button', { name: /看这个词/i }).click();
  await expect(page.getByLabel(/移动端阅读讲解面板/i)).toBeVisible();
  await page.getByRole('button', { name: /关闭/i }).click();

  await expect(page.getByText(/当前阶段：正文/i)).toBeVisible();
});

test('mobile reader expands from a tapped word into a phrase explanation', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');

  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /^panic$/i }).click();
  await page.getByRole('button', { name: /向左扩展/i }).click();
  await page.getByRole('button', { name: /讲解短语/i }).click();

  const panel = page.getByLabel(/移动端阅读讲解面板/i);
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/短语讲解/i)).toBeVisible();
  await expect(panel.getByText(/^less panic$/i)).toBeVisible();
});

test('mobile reader keeps current stage after viewport resize', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');

  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.getByText(/当前阶段：正文/i)).toBeVisible();

  await page.setViewportSize({ width: 412, height: 915 });
  await expect(page.getByText(/当前阶段：正文/i)).toBeVisible();
});

test('mobile reader finishes with the explicit completion action instead of review', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');

  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await expect(page.getByRole('button', { name: /完成本篇阅读/i })).toBeVisible();
  await page.getByRole('button', { name: /完成本篇阅读/i }).click();

  await expect(page.getByText(/这一篇你已经读完了/i)).toBeVisible();
  await expect(page.getByText(/本机阅读复盘/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Submit quiz/i })).toHaveCount(0);
});
