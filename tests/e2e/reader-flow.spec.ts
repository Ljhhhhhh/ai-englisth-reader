import { expect, test, type Page } from '@playwright/test';

async function mockGuidedExplain(page: Page) {
  await page.route('**/api/reader/explain', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        mode: 'word',
        selectedText: 'Guided',
        meaning: '被引导的',
        contextMeaning: '这里强调读者在清晰支持下被带着往前读。',
        explanation: '在这句里，guided 指读者获得外部支持，不再独自摸索。',
        sourceSentence:
          'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
      }),
    });
  });
}

test.describe('desktop reader flow', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'desktop-only reader flow suite');
  });

test('reader restores last stage for the same device without paragraph position', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await expect(page.getByRole('button', { name: /进入正文开始精读/i })).toBeVisible();
  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await expect(
    page.getByRole('heading', { name: /Read English with More Ease/i }),
  ).toBeVisible();

  await page.reload();

  await expect(page.getByText(/已回到上次读到的位置 · 正文/i)).toBeVisible();
  await expect(page.getByText(/当前阶段：正文/i)).toBeVisible();
});

test('reader can lookup and save a word without losing current reading stage', async ({
  page,
}) => {
    await mockGuidedExplain(page);
    await page.goto('/reader/welcome-to-deep-reading');

    await page.getByRole('button', { name: /进入正文开始精读/i }).click();
    await page.getByRole('button', { name: /^guided$/i }).click();
    await page.getByRole('button', { name: /看这个词/i }).click();
    const wordPanel = page.getByLabel(/阅读讲解面板|移动端阅读讲解面板/i);

    await expect(wordPanel).toBeVisible();
    await expect(wordPanel.getByText(/单词讲解/i)).toBeVisible();
    await expect(wordPanel.getByText(/被引导的/i).first()).toBeVisible();

    await page.getByRole('button', { name: /保存这个词/i }).click();
    await expect(
      page.getByRole('button', { name: /已保存到本机/i }),
    ).toBeVisible();

    await page.getByRole('button', { name: /关闭/i }).first().click();
    await expect(page.getByText(/当前阶段：正文/i)).toBeVisible();
});

test('reader can explain a selected phrase inside one sentence', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /^clear$/i }).click();
  await page.getByRole('button', { name: /向右扩展/i }).click();
  await page.getByRole('button', { name: /讲解短语/i }).click();

  const phrasePanel = page.getByLabel(/阅读讲解面板|移动端阅读讲解面板/i);
  await expect(phrasePanel).toBeVisible();
  await expect(phrasePanel.getByText(/短语讲解/i)).toBeVisible();
  await expect(phrasePanel.getByText(/clear support/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /保存这个词/i })).toHaveCount(0);
});

test('reader can open explanation for a non-priority word without phrase suggestions', async ({
  page,
}) => {
  await page.route('**/api/reader/explain', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        mode: 'word',
        selectedText: 'layered',
        meaning: '分层的',
        contextMeaning: '这里强调数据按层次组织，而不是堆在一起。',
        explanation: '在这句里，layered 更接近“分层组织的”系统设计表达。',
        sourceSentence:
          'The Dash prototype demonstrates systemic design: layered contextual data improves query accuracy, databases replace files for storage, and tool permissions are configuration-based rather than prompt-dependent.',
      }),
    });
  });

  await page.goto(
    '/reader/ashpreet-bedi-on-x-systems-engineering-building-agentic-software-that-works-x-5eb0cd',
  );

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();

  const layered = page.getByRole('button', { name: /^layered$/i });
  await layered.click();
  await page.getByRole('button', { name: /看这个词/i }).click();

  const panel = page.getByLabel(/阅读讲解面板|移动端阅读讲解面板/i);
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/单词讲解/i)).toBeVisible();
  await expect(panel.getByText(/^layered$/i)).toBeVisible();
  await expect(panel.getByText(/分层的/i).first()).toBeVisible();
  await expect(panel.getByText(/试试这些短语讲解/i)).toHaveCount(0);
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
  await mockGuidedExplain(page);
  await page.goto('/reader/welcome-to-deep-reading?mockLookupError=once');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /^guided$/i }).click();
  await page.getByRole('button', { name: /看这个词/i }).click();

  const wordPanel = page.getByLabel(/阅读讲解面板|移动端阅读讲解面板/i);
  await expect(wordPanel).toBeVisible();
  await expect(wordPanel.getByText(/单词讲解/i)).toBeVisible();
  await expect(wordPanel.getByText(/被引导的/i)).toBeVisible();
});

test('reader can retry after a temporary save-word failure', async ({
  page,
}) => {
  await mockGuidedExplain(page);
  await page.goto('/reader/welcome-to-deep-reading?mockSaveWordError=once');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /^guided$/i }).click();
  await page.getByRole('button', { name: /看这个词/i }).click();
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
  await page.reload();
  await expect(page.getByText(/当前阶段：正文/i)).toBeVisible();
});

test('reader completes with an explicit completion action instead of review', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await expect(page.getByRole('button', { name: /完成本篇阅读/i })).toBeVisible();
  await page.getByRole('button', { name: /完成本篇阅读/i }).click();

  await expect(page.getByText(/这一篇你已经读完了/i)).toBeVisible();
  await expect(page.getByText(/快速确认一下你刚刚读懂了什么/i)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /开始下一篇/i })).toHaveCount(0);
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

test('reader still opens when the legacy full-translation payload is missing', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading?mockMissingTranslation=1');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await expect(
    page.getByRole('heading', { name: /Read English with More Ease/i }),
  ).toBeVisible();
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
  await mockGuidedExplain(page);
  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /^guided$/i }).click();
  await page.getByRole('button', { name: /看这个词/i }).click();
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
});
