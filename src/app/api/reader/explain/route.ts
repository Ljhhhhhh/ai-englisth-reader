import { loadArticleForViewer } from '@/features/articles/article-service';
import { getCurrentUser } from '@/features/auth/current-user';
import { isServerLlmDebugEnabled } from '@/features/llm-debug/debug-config';
import type { LlmDebugRecord } from '@/features/llm-debug/debug-types';
import { explainReaderSelection } from '@/features/reader/reader-explain-service';

export async function POST(request: Request) {
  let latestDebugRecord: LlmDebugRecord | null = null;

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
    }, {
      onDebugRecord: isServerLlmDebugEnabled()
        ? (record) => {
            latestDebugRecord = record;
          }
        : undefined,
    });

    return Response.json({
      ...result,
      llmDebug: isServerLlmDebugEnabled() ? latestDebugRecord : undefined,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Explain failed',
        llmDebug: isServerLlmDebugEnabled() ? latestDebugRecord : undefined,
      },
      { status: 400 },
    );
  }
}
