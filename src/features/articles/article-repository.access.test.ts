import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadArticleFile } from '@/lib/content/load-article';

const articleMocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    article: articleMocks,
  },
}));

import {
  loadPersistedArticle,
  loadPersistedArticleForUser,
  mapArticleToPersistenceInput,
} from './article-repository';

describe('article-repository access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads public articles without user context', async () => {
    const article = await loadArticleFile('welcome-to-deep-reading.json');
    articleMocks.findFirst.mockResolvedValue({
      ...mapArticleToPersistenceInput(article),
      createdAt: new Date('2026-04-11T00:00:00.000Z'),
      id: 'article-1',
      updatedAt: new Date('2026-04-11T00:00:00.000Z'),
    });

    await expect(loadPersistedArticle(article.slug)).resolves.toMatchObject({
      slug: article.slug,
      title: article.title,
    });
    expect(articleMocks.findFirst).toHaveBeenCalledWith({
      where: {
        slug: article.slug,
        visibility: 'PUBLIC',
      },
    });
  });

  it('allows a signed-in owner to load their private article', async () => {
    const article = await loadArticleFile('welcome-to-deep-reading.json');
    const slug = 'private-generated-article';
    articleMocks.findFirst.mockResolvedValue({
      ...mapArticleToPersistenceInput(
        {
          ...article,
          slug,
          title: 'Private',
        },
        {
          ownerId: 'user-1',
          visibility: 'PRIVATE',
        },
      ),
      createdAt: new Date('2026-04-11T00:00:00.000Z'),
      id: 'article-1',
      updatedAt: new Date('2026-04-11T00:00:00.000Z'),
    });

    await expect(
      loadPersistedArticleForUser(slug, 'user-1'),
    ).resolves.toMatchObject({
      slug,
      title: 'Private',
    });
    expect(articleMocks.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            visibility: 'PUBLIC',
          },
          {
            ownerId: 'user-1',
            visibility: 'PRIVATE',
          },
        ],
        slug,
      },
    });
  });

  it('does not allow anonymous access to a private article', async () => {
    articleMocks.findFirst.mockResolvedValue(null);

    await expect(
      loadPersistedArticleForUser('private-generated-article', null),
    ).rejects.toThrow('Article not found: private-generated-article');
    expect(articleMocks.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            visibility: 'PUBLIC',
          },
        ],
        slug: 'private-generated-article',
      },
    });
  });
});
