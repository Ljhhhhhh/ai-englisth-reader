import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadArticleFile } from '@/lib/content/load-article';

const articleMocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    article: articleMocks,
  },
}));

import {
  listPersistedArticles,
  loadPersistedArticle,
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
        OR: [{ visibility: 'PUBLIC' }],
        slug: article.slug,
      },
    });
  });

  it('lists public articles plus the signed-in user private articles', async () => {
    const article = await loadArticleFile('welcome-to-deep-reading.json');
    articleMocks.findMany.mockResolvedValue([
      {
        ...mapArticleToPersistenceInput(article),
        createdAt: new Date('2026-04-11T00:00:00.000Z'),
        id: 'article-public',
        updatedAt: new Date('2026-04-11T00:00:00.000Z'),
        visibility: 'PUBLIC',
      },
      {
        ...mapArticleToPersistenceInput(
          {
            ...article,
            chinese_title: '我的私有文章',
            slug: 'private-generated-article',
            title: 'Private Article',
          },
          {
            ownerId: 'user-1',
            visibility: 'PRIVATE',
          },
        ),
        createdAt: new Date('2026-04-12T00:00:00.000Z'),
        id: 'article-private',
        updatedAt: new Date('2026-04-12T00:00:00.000Z'),
        visibility: 'PRIVATE',
      },
    ]);

    await expect(
      listPersistedArticles({ viewerUserId: 'user-1' }),
    ).resolves.toMatchObject([
      {
        slug: article.slug,
        title: article.title,
      },
      {
        slug: 'private-generated-article',
        title: 'Private Article',
      },
    ]);

    expect(articleMocks.findMany).toHaveBeenCalledWith({
      orderBy: [
        {
          estimatedMinutes: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
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
      visibility: 'PRIVATE',
    });

    await expect(
      loadPersistedArticle(slug, { viewerUserId: 'user-1' }),
    ).resolves.toMatchObject({
      slug,
      title: 'Private',
    });
  });

  it('does not allow anonymous access to a private article', async () => {
    articleMocks.findFirst.mockResolvedValue(null);

    await expect(
      loadPersistedArticle('private-generated-article'),
    ).rejects.toThrow(
      'Article not found: private-generated-article',
    );
  });
});
