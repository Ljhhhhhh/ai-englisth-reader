import type { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { articleSchema, type Article } from '@/lib/content/article-schema';

type ArticleRecord = Prisma.ArticleGetPayload<Record<string, never>>;

export function mapArticleRecordToArticle(record: ArticleRecord): Article {
  return articleSchema.parse({
    chinese_title: record.chineseTitle,
    chinese_translation: record.chineseTranslation,
    difficulty: record.difficulty,
    estimatedMinutes: record.estimatedMinutes,
    feynman_summary: record.feynmanSummary,
    growth_vocabulary: record.growthVocabularyJson,
    high_frequency_phrases: record.highFrequencyPhrasesJson,
    language_evolution: record.languageEvolutionJson,
    list_summary_zh: record.listSummaryZh,
    paragraphs: record.paragraphsJson,
    slug: record.slug,
    source: record.source,
    title: record.title,
  });
}

export function mapArticleToPersistenceInput(
  article: Article,
  options: {
    ownerId?: string;
    visibility?: Prisma.ArticleCreateInput['visibility'];
  } = {},
) {
  return {
    chineseTitle: article.chinese_title,
    chineseTranslation: article.chinese_translation,
    difficulty: article.difficulty,
    estimatedMinutes: article.estimatedMinutes,
    feynmanSummary: article.feynman_summary,
    growthVocabularyJson: article.growth_vocabulary as Prisma.InputJsonValue,
    highFrequencyPhrasesJson:
      article.high_frequency_phrases as Prisma.InputJsonValue,
    languageEvolutionJson:
      article.language_evolution as Prisma.InputJsonValue,
    listSummaryZh: article.list_summary_zh,
    paragraphsJson: article.paragraphs as Prisma.InputJsonValue,
    slug: article.slug,
    source: article.source,
    title: article.title,
    ownerId: options.ownerId,
    visibility: options.visibility ?? 'PUBLIC',
  } satisfies Prisma.ArticleUncheckedCreateInput;
}

export async function listPersistedArticles() {
  const articles = await db.article.findMany({
    orderBy: [
      {
        estimatedMinutes: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
    where: {
      visibility: 'PUBLIC',
    },
  });

  return articles.map(mapArticleRecordToArticle);
}

export async function loadPersistedArticle(
  slug: string,
  options: { viewerUserId?: string } = {},
) {
  const record = await db.article.findUnique({
    where: {
      slug,
    },
  });

  if (!record) {
    throw new Error(`Article not found: ${slug}`);
  }

  if (
    record.visibility === 'PRIVATE' &&
    (!options.viewerUserId || record.ownerId !== options.viewerUserId)
  ) {
    throw new Error(`Article not found: ${slug}`);
  }

  return mapArticleRecordToArticle(record);
}

export async function upsertPersistedArticle(
  article: Article,
  options: {
    ownerId?: string;
    visibility?: Prisma.ArticleCreateInput['visibility'];
  } = {},
) {
  const data = mapArticleToPersistenceInput(article, options);

  const record = await db.article.upsert({
    create: data,
    update: data,
    where: {
      slug: article.slug,
    },
  });

  return mapArticleRecordToArticle(record);
}
