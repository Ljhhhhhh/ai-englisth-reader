import { loadArticle } from '@/features/articles/article-service';
import { submitQuizForArticle } from '@/features/quiz/quiz-service';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      answers?: number[];
      articleSlug?: string;
      deviceId?: string;
    };

    if (!body.articleSlug || !body.deviceId || !body.answers) {
      return Response.json(
        { error: 'articleSlug, deviceId, and answers are required' },
        { status: 400 },
      );
    }

    const article = await loadArticle(body.articleSlug);
    const result = submitQuizForArticle({
      answers: body.answers,
      article,
      deviceId: body.deviceId,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Quiz submission failed',
      },
      { status: 400 },
    );
  }
}
