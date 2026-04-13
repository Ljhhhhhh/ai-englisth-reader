import { db } from '@/lib/db';

export type ServerSavedWordRecord = {
  articleSlug: string;
  articleTitle: string;
  chineseMeaning: string;
  contextMeaning?: string;
  lemma: string;
  memoryHook: string;
  savedAt: number;
  sentenceId?: string;
  sourceSentence: string;
  surface: string;
  usageExample: string;
};

export async function listSavedWordsForUser(
  userId: string,
  articleSlug?: string,
) {
  const words = await db.savedWord.findMany({
    include: {
      article: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    where: {
      article: articleSlug
        ? {
            slug: articleSlug,
          }
        : undefined,
      userId,
    },
  });

  return words.map(
    (word) =>
      ({
        articleSlug: word.article.slug,
        articleTitle: word.article.chineseTitle,
        chineseMeaning: word.meaning,
        contextMeaning: word.contextMeaning ?? undefined,
        lemma: word.lemma,
        memoryHook: word.memoryHook ?? word.meaning,
        savedAt: word.createdAt.getTime(),
        sentenceId: word.sentenceId ?? undefined,
        sourceSentence: word.sourceSentence,
        surface: word.surface,
        usageExample: word.usageExample ?? word.sourceSentence,
      }) satisfies ServerSavedWordRecord,
  );
}

export async function saveWordForUser(input: ServerSavedWordRecord & { userId: string }) {
  const article = await db.article.findUnique({
    where: {
      slug: input.articleSlug,
    },
  });

  if (!article) {
    throw new Error(`Article not found: ${input.articleSlug}`);
  }

  const record = await db.savedWord.upsert({
    create: {
      articleId: article.id,
      contextMeaning: input.contextMeaning,
      lemma: input.lemma,
      meaning: input.chineseMeaning,
      memoryHook: input.memoryHook,
      sentenceId: input.sentenceId,
      sourceSentence: input.sourceSentence,
      surface: input.surface,
      usageExample: input.usageExample,
      userId: input.userId,
    },
    update: {
      contextMeaning: input.contextMeaning,
      meaning: input.chineseMeaning,
      memoryHook: input.memoryHook,
      sentenceId: input.sentenceId,
      sourceSentence: input.sourceSentence,
      surface: input.surface,
      usageExample: input.usageExample,
    },
    where: {
      userId_articleId_lemma: {
        articleId: article.id,
        lemma: input.lemma,
        userId: input.userId,
      },
    },
  });

  return {
    articleSlug: article.slug,
    articleTitle: article.chineseTitle,
    chineseMeaning: record.meaning,
    contextMeaning: record.contextMeaning ?? undefined,
    lemma: record.lemma,
    memoryHook: record.memoryHook ?? record.meaning,
    savedAt: record.createdAt.getTime(),
    sentenceId: record.sentenceId ?? undefined,
    sourceSentence: record.sourceSentence,
    surface: record.surface,
    usageExample: record.usageExample ?? record.sourceSentence,
  } satisfies ServerSavedWordRecord;
}

export async function deleteWordForUser(input: {
  articleSlug: string;
  lemma: string;
  userId: string;
}) {
  const article = await db.article.findUnique({
    where: {
      slug: input.articleSlug,
    },
  });

  if (!article) {
    return false;
  }

  const result = await db.savedWord.deleteMany({
    where: {
      articleId: article.id,
      lemma: input.lemma,
      userId: input.userId,
    },
  });

  return result.count > 0;
}
