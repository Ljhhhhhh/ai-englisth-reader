import { expect, test } from '@playwright/test';

test('reader restores last stage and paragraph for the same device', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await expect(
    page.getByRole('heading', { name: /更从容地读英文/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/先在这一页把核心词汇、语法点和难句预热一遍/i),
  ).toBeHidden();
  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await expect(page.getByText(/第 1 段 \/ 共 2 段/i)).toBeVisible();

  await page.getByRole('button', { name: /下一段/i }).click();
  await expect(page.getByText(/第 2 段 \/ 共 2 段/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /上一段/i })).toBeVisible();

  await page.reload();

  await expect(page.getByText(/已回到上次读到的位置 · 第 2 段/i)).toBeVisible();
  await expect(page.getByText(/第 2 段 \/ 共 2 段/i)).toBeVisible();
});

test('reader can lookup and save a word without losing reading position', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /下一段/i }).click();
  await expect(page.getByText(/第 2 段 \/ 共 2 段/i)).toBeVisible();

  await page.getByRole('button', { name: /^guided$/i }).click();
  const wordPanel = page.getByLabel(/单词详情弹窗|移动端单词详情/i);

  await expect(wordPanel).toBeVisible();
  await expect(
    wordPanel.getByText(
      /Guided by clear support, the reader can follow the main idea/i,
    ),
  ).toBeVisible();

  await page.getByRole('button', { name: /保存这个词/i }).click();
  await expect(
    page.getByRole('button', { name: /已保存到本机/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: /关闭/i }).first().click();
  await expect(page.getByText(/第 2 段 \/ 共 2 段/i)).toBeVisible();
});

test('reader shows a clear not-found state for unknown articles', async ({
  page,
}) => {
  await page.goto('/reader/does-not-exist');

  await expect(
    page.getByRole('heading', { name: /这个文章地址不存在/i }),
  ).toBeVisible();
});

test('reader can recover from a temporary lookup failure', async ({ page }) => {
  await page.goto('/reader/welcome-to-deep-reading?mockLookupError=once');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /下一段/i }).click();
  await page.getByRole('button', { name: /^guided$/i }).click();

  await expect(
    page.getByRole('heading', { name: /行内查词刚才失败了一次/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: /重新查词/i }).click();
  await expect(page.getByLabel(/单词详情弹窗|移动端单词详情/i)).toBeVisible();
});

test('reader can retry after a temporary save-word failure', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading?mockSaveWordError=once');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /下一段/i }).click();
  await page.getByRole('button', { name: /^guided$/i }).click();
  await page.getByRole('button', { name: /保存这个词/i }).click();

  await expect(page.getByText(/这个词暂时无法保存/i)).toBeVisible();
  await page.getByRole('button', { name: /重试保存/i }).click();
  await expect(
    page.getByRole('button', { name: /已保存到本机/i }),
  ).toBeVisible();
});

test('reader retries progress persistence after a temporary failure', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading?mockProgressSaveError=once');

  await expect(page.getByText(/暂时无法同步阅读进度/i)).toBeVisible();
  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await expect(page.getByText(/暂时无法同步阅读进度/i)).toBeHidden();
  await page.getByRole('button', { name: /下一段/i }).click();
  await page.reload();
  await expect(page.getByText(/第 2 段 \/ 共 2 段/i)).toBeVisible();
});

test('reader completes the three-stage loop without quiz gating', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await expect(page.getByText(/第 1 段 \/ 共 2 段/i)).toBeVisible();
  await page.getByRole('button', { name: /下一段/i }).click();
  await expect(
    page.getByRole('button', { name: /读完，进入复盘/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: /读完，进入复盘/i }).click();

  await expect(
    page.getByRole('heading', { name: /这一篇你已经读完了/i }),
  ).toBeVisible();
  await expect(page.getByText(/快速确认一下你刚刚读懂了什么/i)).toBeVisible();
  await expect(
    page.getByText(/许多学习者能读懂英文文章的一部分/i),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /开始下一篇/i })).toBeVisible();
});

test('reader offers route navigation to sibling articles and core pages', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await expect(page.getByRole('link', { name: /返回首页/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /打开生词本/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /下一篇/i })).toBeVisible();

  await page.getByRole('link', { name: /下一篇/i }).click();
  await expect(page).toHaveURL(
    /\/reader\/deep-reading-beats-scattered-lookup$/,
  );
});

test('reader shows a fallback when translation payload is missing', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading?mockMissingTranslation=1');

  await expect(
    page.getByRole('heading', {
      name: /这篇文章当前无法安全打开/i,
    }),
  ).toBeVisible();
  await expect(page.getByText(/缺少复盘阶段需要的全文译文/i)).toBeVisible();
});

test('reader shows a fallback when article references are malformed', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading?mockBrokenReferences=1');

  await expect(
    page.getByRole('heading', {
      name: /这篇文章当前无法安全打开/i,
    }),
  ).toBeVisible();
  await expect(page.getByText(/学习字段与正文不一致/i)).toBeVisible();
});

test('saved words page groups words by article', async ({ page }) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /下一段/i }).click();
  await page.getByRole('button', { name: /^guided$/i }).click();
  await page.getByRole('button', { name: /保存这个词/i }).click();

  await page.goto('/words');

  await expect(
    page.getByRole('heading', { name: /更从容地读英文/i }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Guided by clear support, the reader can follow the main idea/i,
    ),
  ).toBeVisible();
});
