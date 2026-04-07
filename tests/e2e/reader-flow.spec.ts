import { expect, test } from '@playwright/test';

test('reader restores last stage and paragraph for the same device', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await expect(page.getByText(/Learn the key ideas first/i)).toBeVisible();
  await page
    .getByRole('button', { name: /Start consolidating in the article/i })
    .click();

  await expect(page.getByText(/Current stage: Read/i)).toBeVisible();
  await page.getByRole('button', { name: /Jump to paragraph 2/i }).click();
  await expect(page.getByText(/Current paragraph: p2/i)).toBeVisible();

  await page.reload();

  await expect(page.getByText(/Resume ready: read · p2/i)).toBeVisible();
  await expect(page.getByText(/Current stage: Read/i)).toBeVisible();
  await expect(page.getByText(/Current paragraph: p2/i)).toBeVisible();
});

test('reader can lookup and save a word without losing reading position', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await page
    .getByRole('button', { name: /Start consolidating in the article/i })
    .click();
  await page.getByRole('button', { name: /Jump to paragraph 2/i }).click();
  await expect(page.getByText(/Current paragraph: p2/i)).toBeVisible();

  await page.getByRole('button', { name: /^absorbed$/i }).click();
  const wordPanel = page.getByLabel(/Word details (desktop|mobile|popover)/i);

  await expect(wordPanel).toBeVisible();
  await expect(
    wordPanel.getByText(
      /When the reader feels absorbed instead of interrupted/i,
    ),
  ).toBeVisible();

  await page.getByRole('button', { name: /Save word/i }).click();
  await expect(
    page.getByRole('button', { name: /Saved to this device/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: /Close/i }).first().click();
  await expect(page.getByText(/Current paragraph: p2/i)).toBeVisible();
});

test('reader shows a clear not-found state for unknown articles', async ({
  page,
}) => {
  await page.goto('/reader/does-not-exist');

  await expect(
    page.getByRole('heading', { name: /That article route does not exist/i }),
  ).toBeVisible();
});

test('reader can recover from a temporary lookup failure', async ({ page }) => {
  await page.goto('/reader/welcome-to-deep-reading?mockLookupError=once');

  await page
    .getByRole('button', { name: /Start consolidating in the article/i })
    .click();
  await page.getByRole('button', { name: /^absorbed$/i }).click();

  await expect(
    page.getByRole('heading', { name: /Inline word lookup missed once/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Retry lookup/i }).click();
  await expect(
    page.getByLabel(/Word details (desktop|mobile|popover)/i),
  ).toBeVisible();
});

test('reader can retry after a temporary save-word failure', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading?mockSaveWordError=once');

  await page
    .getByRole('button', { name: /Start consolidating in the article/i })
    .click();
  await page.getByRole('button', { name: /^absorbed$/i }).click();
  await page.getByRole('button', { name: /Save word/i }).click();

  await expect(
    page.getByText(/Could not save this word right now/i),
  ).toBeVisible();
  await page.getByRole('button', { name: /Retry save/i }).click();
  await expect(
    page.getByRole('button', { name: /Saved to this device/i }),
  ).toBeVisible();
});

test('reader retries progress persistence after a temporary failure', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading?mockProgressSaveError=once');

  await expect(
    page.getByText(/Could not sync reading progress just yet/i),
  ).toBeVisible();
  await page
    .getByRole('button', { name: /Start consolidating in the article/i })
    .click();
  await expect(
    page.getByText(/Could not sync reading progress just yet/i),
  ).toBeHidden();
  await page.getByRole('button', { name: /Jump to paragraph 2/i }).click();
  await page.reload();
  await expect(page.getByText(/Current paragraph: p2/i)).toBeVisible();
});

test('reader completes the three-stage loop without quiz gating', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await page
    .getByRole('button', { name: /Start consolidating in the article/i })
    .click();
  await page.getByRole('button', { name: /Continue to review/i }).click();

  await expect(
    page.getByText(/Reading review on this device/i),
  ).toBeVisible();
  await expect(page.getByText(/当词汇帮助始终贴着文章出现时/i)).toBeVisible();
});

test('reader offers route navigation to sibling articles and core pages', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await expect(page.getByRole('link', { name: /Back to homepage/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open saved words/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Next article/i })).toBeVisible();

  await page.getByRole('link', { name: /Next article/i }).click();
  await expect(page).toHaveURL(/\/reader\/deep-reading-beats-scattered-lookup$/);
});

test('reader shows a fallback when translation payload is missing', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading?mockMissingTranslation=1');

  await expect(
    page.getByRole('heading', {
      name: /This article cannot be opened safely right now/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/missing its review translation payload/i),
  ).toBeVisible();
});

test('reader shows a fallback when article references are malformed', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading?mockBrokenReferences=1');

  await expect(
    page.getByRole('heading', {
      name: /This article cannot be opened safely right now/i,
    }),
  ).toBeVisible();
  await expect(page.getByText(/broken sentence references/i)).toBeVisible();
});

test('saved words page groups words by article', async ({ page }) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await page
    .getByRole('button', { name: /Start consolidating in the article/i })
    .click();
  await page.getByRole('button', { name: /^absorbed$/i }).click();
  await page.getByRole('button', { name: /Save word/i }).click();

  await page.goto('/words');

  await expect(
    page.getByRole('heading', { name: /A calmer way to read English/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/When the reader feels absorbed instead of interrupted/i),
  ).toBeVisible();
});
