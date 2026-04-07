import { loadArticle } from '@/features/articles/article-service';
import { lookupWordFromArticle } from '@/features/reader/word-lookup-service';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sentenceId?: string;
      slug?: string;
      surface?: string;
    };

    if (!body.slug || !body.surface || !body.sentenceId) {
      return Response.json(
        { error: 'slug, surface, and sentenceId are required' },
        { status: 400 },
      );
    }

    const article = await loadArticle(body.slug);
    const result = lookupWordFromArticle({
      article,
      surface: body.surface,
      sentenceId: body.sentenceId,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Lookup failed',
      },
      { status: 400 },
    );
  }
}
