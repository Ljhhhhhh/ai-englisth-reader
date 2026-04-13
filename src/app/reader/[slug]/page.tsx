import Link from 'next/link';
import { ErrorState } from '@/components/system/error-state';
import { notFound } from 'next/navigation';
import { ReaderShell } from '@/components/reader/reader-shell';
import {
  listArticles,
  loadArticleForViewer,
} from '@/features/articles/article-service';
import { getCurrentUser } from '@/features/auth/current-user';
import { requirePageSession } from '@/features/auth/page-guard';
import type { Article } from '@/lib/content/article-schema';
import { uiCopy } from '@/lib/ui-copy';

export const dynamic = 'force-dynamic';

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
      chinese_translation: '',
    };
  }

  if (searchParams?.mockBrokenReferences === '1') {
    nextArticle = {
      ...nextArticle,
      language_evolution: {
        ...nextArticle.language_evolution,
        rewritten_sentence: 'This sentence does not exist in the summary.',
      },
    };
  }

  return nextArticle;
}

function validateReaderArticle(article: Article) {
  if (
    !article.feynman_summary.includes(
      article.language_evolution.rewritten_sentence,
    )
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
    const user = await getCurrentUser();
    const [article, articles] = await Promise.all([
      loadArticleForViewer(slug, user?.id),
      listArticles(),
    ]);
    const nextArticle = applyReaderMocks(article, searchParams);
    const issue = validateReaderArticle(nextArticle);
    const currentIndex = articles.findIndex((item) => item.slug === slug);
    const getNavigationTitle = (input: Article) => {
      const articleView = input as Article & { chinese_title?: string };
      return articleView.chinese_title ?? input.title;
    };
    const previousArticle =
      currentIndex > 0
        ? {
            slug: articles[currentIndex - 1].slug,
            title: getNavigationTitle(articles[currentIndex - 1]),
          }
        : undefined;
    const followingArticle =
      currentIndex >= 0 && currentIndex < articles.length - 1
        ? {
            slug: articles[currentIndex + 1].slug,
            title: getNavigationTitle(articles[currentIndex + 1]),
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

function toSearchParamEntries(
  searchParams: Record<string, string | string[] | undefined>,
) {
  return Object.entries(searchParams).flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      return value.map((item) => [key, item] as [string, string]);
    }

    return value ? [[key, value] as [string, string]] : [];
  });
}

export default async function ReaderPage({
  params,
  searchParams,
}: ReaderPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const readerSearch = resolvedSearchParams
    ? new URLSearchParams(toSearchParamEntries(resolvedSearchParams)).toString()
    : '';
  await requirePageSession(
    `/reader/${slug}${readerSearch ? `?${readerSearch}` : ''}`,
  );
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
