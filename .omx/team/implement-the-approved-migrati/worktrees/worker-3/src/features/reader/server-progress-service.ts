import { db } from '@/lib/db';

export type ServerReaderProgressRecord = {
  articleSlug: string;
  currentStage: string;
  isCompleted: boolean;
  updatedAt: string;
};

export async function getReaderProgress(userId: string, articleSlug: string) {
  const progress = await db.readingProgress.findFirst({
    include: {
      article: true,
    },
    where: {
      article: {
        slug: articleSlug,
      },
      userId,
    },
  });

  if (!progress) {
    return null;
  }

  return {
    articleSlug: progress.article.slug,
    currentStage: progress.currentStage,
    isCompleted: progress.isCompleted,
    updatedAt: progress.updatedAt.toISOString(),
  } satisfies ServerReaderProgressRecord;
}

export async function listRecentReaderProgress(userId: string) {
  const records = await db.readingProgress.findMany({
    include: {
      article: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
    where: {
      userId,
    },
  });

  return records.map(
    (record) =>
      ({
        articleSlug: record.article.slug,
        currentStage: record.currentStage,
        isCompleted: record.isCompleted,
        updatedAt: record.updatedAt.toISOString(),
      }) satisfies ServerReaderProgressRecord,
  );
}

export async function saveReaderProgress(input: {
  articleSlug: string;
  currentStage: string;
  isCompleted: boolean;
  userId: string;
}) {
  const article = await db.article.findUnique({
    where: {
      slug: input.articleSlug,
    },
  });

  if (!article) {
    throw new Error(`Article not found: ${input.articleSlug}`);
  }

  const progress = await db.readingProgress.upsert({
    create: {
      articleId: article.id,
      currentStage: input.currentStage,
      isCompleted: input.isCompleted,
      userId: input.userId,
    },
    update: {
      currentStage: input.currentStage,
      isCompleted: input.isCompleted,
    },
    where: {
      userId_articleId: {
        articleId: article.id,
        userId: input.userId,
      },
    },
  });

  return {
    articleSlug: input.articleSlug,
    currentStage: progress.currentStage,
    isCompleted: progress.isCompleted,
    updatedAt: progress.updatedAt.toISOString(),
  } satisfies ServerReaderProgressRecord;
}
