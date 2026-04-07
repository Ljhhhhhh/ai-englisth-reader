import Link from 'next/link';
import { EmptyState } from '@/components/system/empty-state';
import { ErrorState } from '@/components/system/error-state';
import { ArticleCard } from '@/components/home/article-card';
import { ContinueReading } from '@/components/home/continue-reading';
import { listArticles } from '@/features/articles/article-service';

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
          eyebrow="Articles unavailable"
          title="The homepage could not load article content."
          description="Refresh the page or verify that the sample article JSON files are present and valid under content/articles."
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
            Retry homepage
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
            Interactive English reading MVP
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(2.4rem, 6vw, 4.5rem)',
              lineHeight: 1,
            }}
          >
            Read one article deeply.
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
            Stay inside one article, understand the hard parts in context, and
            carry the key words forward instead of breaking your focus across
            scattered tools.
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
            eyebrow="No sample articles yet"
            title="The reading shelf is empty on this machine."
            description="Seed or restore article JSON content under content/articles, then refresh the homepage. Once at least one article is available, the deep-reading loop will appear here."
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
              Retry homepage
            </Link>
          </EmptyState>
        )}
      </section>
    </main>
  );
}
