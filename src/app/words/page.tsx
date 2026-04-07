import Link from 'next/link';
import { ErrorState } from '@/components/system/error-state';
import { WordList } from '@/components/words/word-list';

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
          eyebrow="Saved words unavailable"
          title="The saved-word notebook could not be opened."
          description="Refresh the page once. If the problem persists, go back to the reader and try again from the same device."
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
            Retry words page
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
          Saved words
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
          Words you kept from real reading
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          Review saved vocabulary by article, search by meaning or lemma, and
          jump back into the reading loop.
        </p>
      </section>

      <WordList />
    </main>
  );
}
