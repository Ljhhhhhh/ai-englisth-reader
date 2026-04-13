import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalNodeEnv = process.env.NODE_ENV;

describe('article-service development fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, { NODE_ENV: 'development' });
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    Object.assign(process.env, { NODE_ENV: originalNodeEnv });
  });

  it('falls back to file-backed article listings when the database is unavailable', async () => {
    vi.doMock('@/features/articles/article-repository', () => ({
      listPersistedArticles: vi
        .fn()
        .mockRejectedValue(new Error('pool timeout: failed to retrieve a connection from pool')),
    }));

    const { listArticles } = await import('./article-service');
    const articles = await listArticles();

    expect(articles.length).toBeGreaterThanOrEqual(3);
    expect(articles.some((article) => article.slug === 'welcome-to-deep-reading')).toBe(true);
  });

  it('falls back to file-backed article loading when the database is unavailable', async () => {
    vi.doMock('@/features/articles/article-repository', () => ({
      loadPersistedArticle: vi
        .fn()
        .mockRejectedValue(new Error('pool timeout: failed to retrieve a connection from pool')),
    }));

    const { loadArticleForViewer } = await import('./article-service');
    const article = await loadArticleForViewer('welcome-to-deep-reading');

    expect(article.slug).toBe('welcome-to-deep-reading');
    expect(article.chinese_title).toBe('更从容地读英文');
  });
});
