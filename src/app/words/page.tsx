import Link from 'next/link';
import { ErrorState } from '@/components/system/error-state';
import { WordList } from '@/components/words/word-list';
import { uiCopy } from '@/lib/ui-copy';

type WordsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WordsPage({ searchParams }: WordsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (resolvedSearchParams?.mockWordsError === '1') {
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
          eyebrow={uiCopy.words.pageError.eyebrow}
          title={uiCopy.words.pageError.title}
          description={uiCopy.words.pageError.description}
        >
          <Link
            href="/words"
            style={{
              width: 'fit-content',
              padding: '12px 18px',
              borderRadius: 999,
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            {uiCopy.words.actions.retry}
          </Link>
        </ErrorState>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '40px 20px 72px',
        display: 'grid',
        gap: 24,
      }}
    >
      <section style={{ display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 600 }}>
          {uiCopy.words.page.eyebrow}
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
          {uiCopy.words.page.title}
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          {uiCopy.words.page.description}
        </p>
      </section>

      <WordList />
    </main>
  );
}
