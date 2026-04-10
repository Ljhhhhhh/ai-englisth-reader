import { beforeEach, describe, expect, it, vi } from 'vitest';

const articleMocks = vi.hoisted(() => ({
  loadArticle: vi.fn(),
}));

const explainMocks = vi.hoisted(() => ({
  explainReaderSelection: vi.fn(),
}));

vi.mock('@/features/articles/article-service', () => articleMocks);
vi.mock('@/features/reader/reader-explain-service', () => explainMocks);

import { POST } from './route';

describe('POST /api/reader/explain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects incomplete requests', async () => {
    const response = await POST(
      new Request('http://localhost/api/reader/explain', {
        body: JSON.stringify({ articleSlug: 'welcome-to-deep-reading' }),
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        'articleSlug, sentenceId, sentenceText, selectedText, and mode are required',
    });
  });

  it('loads the article and returns the explanation payload', async () => {
    articleMocks.loadArticle.mockResolvedValue({ slug: 'welcome-to-deep-reading' });
    explainMocks.explainReaderSelection.mockResolvedValue({
      mode: 'phrase',
      selectedText: 'clear support',
      meaning: '清晰的支持',
      contextMeaning: '这里指阅读时得到明确帮助。',
      explanation: 'clear 修饰 support，合起来表示明确、能落地的帮助。',
      sourceSentence:
        'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
    });

    const response = await POST(
      new Request('http://localhost/api/reader/explain', {
        body: JSON.stringify({
          articleSlug: 'welcome-to-deep-reading',
          sentenceId: 's3',
          sentenceText:
            'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
          selectedText: 'clear support',
          mode: 'phrase',
        }),
        method: 'POST',
      }),
    );

    expect(response.status).toBe(200);
    expect(articleMocks.loadArticle).toHaveBeenCalledWith(
      'welcome-to-deep-reading',
    );
    expect(explainMocks.explainReaderSelection).toHaveBeenCalledWith({
      article: { slug: 'welcome-to-deep-reading' },
      mode: 'phrase',
      selectedText: 'clear support',
      sentenceId: 's3',
      sentenceText:
        'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
    });
    await expect(response.json()).resolves.toEqual({
      mode: 'phrase',
      selectedText: 'clear support',
      meaning: '清晰的支持',
      contextMeaning: '这里指阅读时得到明确帮助。',
      explanation: 'clear 修饰 support，合起来表示明确、能落地的帮助。',
      sourceSentence:
        'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
    });
  });
});
