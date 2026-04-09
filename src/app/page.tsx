import Link from 'next/link';
import { EmptyState } from '@/components/system/empty-state';
import { ErrorState } from '@/components/system/error-state';
import { ArticleCard } from '@/components/home/article-card';
import { ContinueReading } from '@/components/home/continue-reading';
import { listArticles } from '@/features/articles/article-service';
import { uiCopy } from '@/lib/ui-copy';

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

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
        </div>

        <ContinueReading
          articles={articles.map((article) => ({
            slug: article.slug,
            title: article.title,
          }))}
        />

        {articles.length ? (
          <section style={{ display: 'grid', gap: 20 }}>
            {articles.map((article) => (
              <ArticleCard key={article.slug} {...article} />
            ))}
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
