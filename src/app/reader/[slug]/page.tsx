import Link from 'next/link';
import { ErrorState } from '@/components/system/error-state';
import { notFound } from 'next/navigation';
import { ReaderShell } from '@/components/reader/reader-shell';
import { listArticles, loadArticle } from '@/features/articles/article-service';
import type { Article } from '@/lib/content/article-schema';
import { uiCopy } from '@/lib/ui-copy';

type ReaderPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function applyReaderMocks(
  article: Article,
  searchParams?: Record<string, string | string[] | undefined>,
) {
  let nextArticle = article;

  if (searchParams?.mockMissingTranslation === '1') {
    nextArticle = {
      ...nextArticle,
      translation: '',
    };
  }

  if (searchParams?.mockBrokenReferences === '1') {
    nextArticle = {
      ...nextArticle,
      vocabulary: nextArticle.vocabulary.map((item, index) =>
        index === 0
          ? { ...item, exampleSentenceId: 'missing-sentence-id' }
          : item,
      ),
    };
  }

  return nextArticle;
}

function validateReaderArticle(article: Article) {
  if (!article.translation.trim()) {
    return uiCopy.reader.page.issues.missingTranslation;
  }

  const sentenceIds = new Set(
    article.paragraphs.flatMap((paragraph) =>
      paragraph.sentences.map((sentence) => sentence.id),
    ),
  );

  const hasBrokenVocabularyRef = article.vocabulary.some(
    (item) => !sentenceIds.has(item.exampleSentenceId),
  );
  const hasBrokenGrammarRef = article.grammarPoints.some(
    (item) => !sentenceIds.has(item.sourceSentenceId),
  );
  const hasBrokenSentenceNoteRef = article.difficultSentences.some(
    (item) => !sentenceIds.has(item.sentenceId),
  );

  if (
    hasBrokenVocabularyRef ||
    hasBrokenGrammarRef ||
    hasBrokenSentenceNoteRef
  ) {
    return uiCopy.reader.page.issues.brokenReferences;
  }

  return null;
}

async function getReaderArticle(
  slug: string,
  searchParams?: Record<string, string | string[] | undefined>,
) {
  try {
    const [article, articles] = await Promise.all([
      loadArticle(slug),
      listArticles(),
    ]);
    const nextArticle = applyReaderMocks(article, searchParams);
    const issue = validateReaderArticle(nextArticle);
    const currentIndex = articles.findIndex((item) => item.slug === slug);
    const previousArticle =
      currentIndex > 0
        ? {
            slug: articles[currentIndex - 1].slug,
            title: articles[currentIndex - 1].title,
          }
        : undefined;
    const followingArticle =
      currentIndex >= 0 && currentIndex < articles.length - 1
        ? {
            slug: articles[currentIndex + 1].slug,
            title: articles[currentIndex + 1].title,
          }
        : undefined;

    if (issue) {
      return {
        kind: 'invalid' as const,
        issue,
      };
    }

    return {
      article: nextArticle,
      kind: 'ok' as const,
      navigation: {
        nextArticle: followingArticle,
        previousArticle,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Article not found')) {
      return {
        kind: 'not-found' as const,
      };
    }

    return {
      issue:
        error instanceof Error
          ? error.message
          : uiCopy.reader.page.issues.unknownLoadError,
      kind: 'error' as const,
    };
  }
}

export default async function ReaderPage({
  params,
  searchParams,
}: ReaderPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const result = await getReaderArticle(slug, resolvedSearchParams);

  if (result.kind === 'not-found') {
    notFound();
  }

  if (result.kind === 'invalid' || result.kind === 'error') {
    return (
      <main
        style={{
          minHeight: '100vh',
          padding: '40px 20px 72px',
          display: 'grid',
          gap: 24,
        }}
      >
        <ErrorState
          eyebrow={uiCopy.reader.page.error.eyebrow}
          title={uiCopy.reader.page.error.title}
          description={result.issue}
        >
          <Link
            href="/"
            style={{
              width: 'fit-content',
              padding: '12px 18px',
              borderRadius: 999,
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            {uiCopy.common.backHome}
          </Link>
        </ErrorState>
      </main>
    );
  }

  return (
    <ReaderShell article={result.article} navigation={result.navigation} />
  );
}
