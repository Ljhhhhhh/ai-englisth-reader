import { beforeEach, describe, expect, it, vi } from 'vitest';

const articleMocks = vi.hoisted(() => ({
  loadArticle: vi.fn(),
}));

const currentUserMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const lookupMocks = vi.hoisted(() => ({
  lookupWordFromArticle: vi.fn(),
}));

vi.mock('@/features/articles/article-service', () => articleMocks);
vi.mock('@/features/auth/current-user', () => currentUserMocks);
vi.mock('@/features/reader/word-lookup-service', () => lookupMocks);

import { POST } from './route';

describe('POST /api/lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserMocks.getCurrentUser.mockResolvedValue(null);
  });

  it('rejects incomplete requests', async () => {
    const response = await POST(
      new Request('http://localhost/api/lookup', {
        body: JSON.stringify({ slug: 'welcome-to-deep-reading' }),
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'slug, surface, and sentenceId are required',
    });
  });

  it('passes anonymous access through as public-only article loading', async () => {
    articleMocks.loadArticle.mockResolvedValue({ slug: 'welcome-to-deep-reading' });
    lookupMocks.lookupWordFromArticle.mockReturnValue({
      lemma: 'clear',
      surface: 'clear',
    });

    const response = await POST(
      new Request('http://localhost/api/lookup', {
        body: JSON.stringify({
          sentenceId: 's1',
          slug: 'welcome-to-deep-reading',
          surface: 'clear',
        }),
        method: 'POST',
      }),
    );

    expect(response.status).toBe(200);
    expect(articleMocks.loadArticle).toHaveBeenCalledWith(
      'welcome-to-deep-reading',
      { userId: null },
    );
    expect(lookupMocks.lookupWordFromArticle).toHaveBeenCalledWith({
      article: { slug: 'welcome-to-deep-reading' },
      sentenceId: 's1',
      surface: 'clear',
    });
    await expect(response.json()).resolves.toEqual({
      lemma: 'clear',
      surface: 'clear',
    });
  });

  it('passes the authenticated user id for private article lookups', async () => {
    currentUserMocks.getCurrentUser.mockResolvedValue({ id: 'user-1' });
    articleMocks.loadArticle.mockResolvedValue({ slug: 'private-generated-article' });
    lookupMocks.lookupWordFromArticle.mockReturnValue({
      lemma: 'focus',
      surface: 'focus',
    });

    const response = await POST(
      new Request('http://localhost/api/lookup', {
        body: JSON.stringify({
          sentenceId: 's2',
          slug: 'private-generated-article',
          surface: 'focus',
        }),
        method: 'POST',
      }),
    );

    expect(response.status).toBe(200);
    expect(articleMocks.loadArticle).toHaveBeenCalledWith(
      'private-generated-article',
      { userId: 'user-1' },
    );
  });
});
