import { expect, test } from '@playwright/test';

test('user can open an article from the homepage', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /read one article deeply/i }),
  ).toBeVisible();
  await expect(page.getByText(/A calmer way to read English/i)).toBeVisible();

  await page
    .getByRole('link', { name: /start reading/i })
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
      name: /The reading shelf is empty on this machine/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Retry homepage/i }),
  ).toBeVisible();
});

test('saved words page explains the empty notebook state', async ({ page }) => {
  await page.goto('/words');

  await expect(
    page.getByRole('heading', {
      name: /Your word notebook starts after the first lookup you keep/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Browse articles/i }),
  ).toBeVisible();
});
