import { loadArticleForViewer } from '@/features/articles/article-service';
import { getCurrentUser } from '@/features/auth/current-user';
import { explainReaderSelection } from '@/features/reader/reader-explain-service';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      articleSlug?: string;
      sentenceId?: string;
      sentenceText?: string;
      selectedText?: string;
      mode?: 'word' | 'phrase';
    };

    if (
      !body.articleSlug ||
      !body.sentenceId ||
      !body.sentenceText ||
      !body.selectedText ||
      !body.mode
    ) {
      return Response.json(
        {
          error:
            'articleSlug, sentenceId, sentenceText, selectedText, and mode are required',
        },
        { status: 400 },
      );
    }

    const user = await getCurrentUser();
    const article = await loadArticleForViewer(body.articleSlug, user?.id);
    const result = await explainReaderSelection({
      article,
      mode: body.mode,
      selectedText: body.selectedText,
      sentenceId: body.sentenceId,
      sentenceText: body.sentenceText,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Explain failed',
      },
      { status: 400 },
    );
  }
}
