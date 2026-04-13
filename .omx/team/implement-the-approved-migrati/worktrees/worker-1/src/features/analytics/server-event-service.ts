import { db } from '@/lib/db';

export async function recordLearningEvent(input: {
  articleSlug?: string;
  payload?: Record<string, string | number | boolean | null>;
  type: string;
  userId: string;
}) {
  const article = input.articleSlug
    ? await db.article.findUnique({
        where: {
          slug: input.articleSlug,
        },
      })
    : null;

  const event = await db.learningEvent.create({
    data: {
      articleId: article?.id,
      payloadJson: input.payload ? JSON.stringify(input.payload) : null,
      type: input.type,
      userId: input.userId,
    },
  });

  return {
    articleSlug: input.articleSlug,
    createdAt: event.createdAt.getTime(),
    payload: input.payload,
    type: input.type,
  };
}
