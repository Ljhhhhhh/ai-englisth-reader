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
  const wordPanel = page.getByLabel(/阅读讲解面板|移动端阅读讲解面板/i);

  await expect(wordPanel).toBeVisible();
  await expect(wordPanel.getByText(/单词讲解/i)).toBeVisible();
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

test('reader can open phrase explanation from suggested shortcuts after tapping a word', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /下一段/i }).click();
  await page.getByRole('button', { name: /^panic$/i }).click();

  const panel = page.getByLabel(/阅读讲解面板|移动端阅读讲解面板/i);
  await expect(panel.getByText(/试试这些短语讲解/i)).toBeVisible();
  await panel.getByRole('button', { name: /main idea/i }).click();

  await expect(panel.getByText(/短语讲解/i)).toBeVisible();
  await expect(panel.getByText(/^main idea$/i)).toBeVisible();
  await expect(panel.getByRole('button', { name: /保存这个词/i })).toHaveCount(0);
});

test('reader can explain a selected phrase inside one sentence', async ({
  page,
}) => {
  await page.goto('/reader/welcome-to-deep-reading');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /下一段/i }).click();

  await page.evaluate(() => {
    const clear = Array.from(document.querySelectorAll('span,button')).find(
      (node) => node.textContent === 'clear',
    );
    const support = Array.from(document.querySelectorAll('span,button')).find(
      (node) => node.textContent === 'support',
    );

    if (!clear || !support || !clear.firstChild || !support.firstChild) {
      throw new Error('Could not find phrase nodes');
    }

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(clear.firstChild, 0);
    range.setEnd(support.firstChild, 'support'.length);
    selection?.removeAllRanges();
    selection?.addRange(range);
    clear.closest('p')?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });

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
  await page.getByRole('button', { name: /下一段/i }).click();
  await page.getByRole('button', { name: /下一段/i }).click();

  const layered = page.getByRole('button', { name: /^layered$/i });
  await layered.click();

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
  await page.goto('/reader/welcome-to-deep-reading?mockLookupError=once');

  await page.getByRole('button', { name: /进入正文开始精读/i }).click();
  await page.getByRole('button', { name: /下一段/i }).click();
  await page.getByRole('button', { name: /^guided$/i }).click();

  const wordPanel = page.getByLabel(/阅读讲解面板|移动端阅读讲解面板/i);
  await expect(wordPanel).toBeVisible();
  await expect(wordPanel.getByText(/单词讲解/i)).toBeVisible();
  await expect(wordPanel.getByText(/被引导的/i)).toBeVisible();
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
