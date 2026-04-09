import { expect, test } from '@playwright/test';

test('user can open an article from the homepage', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /一次真正读懂一篇英文文章/i }),
  ).toBeVisible();
  await expect(page.getByText(/更从容地读英文/i)).toBeVisible();

  await page
    .getByRole('link', { name: /开始精读/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/reader\//);
});

test('homepage explains when no seed articles are available', async ({
  page,
}) => {
  await page.goto('/?mockEmptyArticles=1');

  await expect(
    page.getByRole('heading', {
      name: /这台设备上的阅读书架还是空的/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /重新加载首页/i })).toBeVisible();
});

test('homepage continue-reading card resumes from the last paragraph', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');
  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /下一段/i }).click();
  await expect(page.getByText(/第 2 段 \/ 共 2 段/i)).toBeVisible();

  await page.goto('/');
  await expect(page.getByText(/上次读到第 2 段/i)).toBeVisible();

  await page.getByRole('link', { name: /继续阅读/i }).click();
  await expect(page).toHaveURL(/\/reader\/welcome-to-deep-reading/);
  await expect(page.getByText(/第 2 段 \/ 共 2 段/i)).toBeVisible();
});

test('saved words page explains the empty notebook state', async ({ page }) => {
  await page.goto('/words');

  await expect(
    page.getByRole('heading', {
      name: /当你第一次保留查词结果后，生词本才会开始积累内容/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /去看文章/i })).toBeVisible();
});
