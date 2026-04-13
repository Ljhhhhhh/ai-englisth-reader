import Link from 'next/link';
import { EmailLoginCard } from '@/components/auth/email-login-card';
import { EmptyState } from '@/components/system/empty-state';
import { ErrorState } from '@/components/system/error-state';
import { ArticleCard } from '@/components/home/article-card';
import { ContinueReading } from '@/components/home/continue-reading';
import { listArticles } from '@/features/articles/article-service';
import { requirePageSession } from '@/features/auth/page-guard';
import { uiCopy } from '@/lib/ui-copy';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  await requirePageSession('/');

  let articles;

  try {
    articles =
      resolvedSearchParams?.mockEmptyArticles === '1'
        ? []
        : await listArticles();
  } catch {
    return (
      <main
        style={{
          minHeight: '100vh',
          padding: '48px 20px 72px',
        }}
      >
        <ErrorState
          eyebrow={uiCopy.home.error.eyebrow}
          title={uiCopy.home.error.title}
          description={uiCopy.home.error.description}
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
            {uiCopy.common.retryHome}
          </Link>
        </ErrorState>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '48px 20px 72px',
      }}
    >
      <section
        style={{
          display: 'grid',
          gap: 24,
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: 16,
            padding: '32px 28px',
            borderRadius: 32,
            background:
              'linear-gradient(135deg, rgba(255,248,238,0.96) 0%, rgba(249,235,217,0.96) 100%)',
            border: '1px solid var(--border)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--accent)', fontSize: 14 }}>
            {uiCopy.home.hero.eyebrow}
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(2.4rem, 6vw, 4.5rem)',
              lineHeight: 1,
            }}
          >
            {uiCopy.home.hero.title}
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
            {uiCopy.home.hero.description}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link
              href="/generate"
              style={{
                width: 'fit-content',
                padding: '12px 18px',
                borderRadius: 999,
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              生成文章
            </Link>
            <Link
              href="/words?from=home"
              style={{
                width: 'fit-content',
                padding: '12px 18px',
                borderRadius: 999,
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                fontWeight: 700,
              }}
            >
              打开生词本
            </Link>
          </div>
        </div>

        <EmailLoginCard />

        <ContinueReading
          articles={articles.map((article) => {
            const articleView = article as typeof article & {
              chinese_title?: string;
            };

            return {
              slug: article.slug,
              chineseTitle: articleView.chinese_title ?? article.title,
            };
          })}
        />

        {articles.length ? (
          <section style={{ display: 'grid', gap: 20 }}>
            {articles.map((article) => {
              const articleView = article as typeof article & {
                chinese_title?: string;
                list_summary_zh?: string;
              };

              return (
                <ArticleCard
                  key={article.slug}
                  difficulty={article.difficulty}
                  estimatedMinutes={article.estimatedMinutes}
                  previewText={
                    articleView.list_summary_zh ?? article.feynman_summary
                  }
                  slug={article.slug}
                  title={articleView.chinese_title ?? article.title}
                />
              );
            })}
          </section>
        ) : (
          <EmptyState
            eyebrow={uiCopy.home.empty.eyebrow}
            title={uiCopy.home.empty.title}
            description={uiCopy.home.empty.description}
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
              {uiCopy.common.retryHome}
            </Link>
          </EmptyState>
        )}
      </section>
    </main>
  );
}
