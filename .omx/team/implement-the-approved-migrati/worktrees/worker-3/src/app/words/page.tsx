import Link from 'next/link';
import { ErrorState } from '@/components/system/error-state';
import { WordList } from '@/components/words/word-list';
import { uiCopy } from '@/lib/ui-copy';

type WordsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readFirstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WordsPage({ searchParams }: WordsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const from = readFirstParam(resolvedSearchParams?.from);
  const articleSlug = readFirstParam(resolvedSearchParams?.articleSlug);
  const backHref =
    from === 'reader' && articleSlug ? `/reader/${articleSlug}` : '/';
  const backLabel =
    from === 'reader' && articleSlug
      ? uiCopy.words.actions.backReader
      : uiCopy.words.actions.backHome;

  if (resolvedSearchParams?.mockWordsError === '1') {
    return (
      <main style={{ minHeight: '100vh', padding: '40px 24px 72px' }}>
        <ErrorState
          eyebrow={uiCopy.words.pageError.eyebrow}
          title={uiCopy.words.pageError.title}
          description={uiCopy.words.pageError.description}
        >
          <Link
            href={backHref}
            style={{
              width: 'fit-content',
              padding: '12px 18px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              fontWeight: 700,
            }}
          >
            {backLabel}
          </Link>
          <Link
            href={
              from === 'reader' && articleSlug
                ? `/words?from=reader&articleSlug=${encodeURIComponent(articleSlug)}`
                : '/words?from=home'
            }
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
    <main style={{ minHeight: '100vh', padding: '40px 24px 72px' }}>
      <header
        style={{
          position: 'sticky',
          top: 12,
          zIndex: 5,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 20,
          padding: '14px 16px',
          borderRadius: 20,
          border: '1px solid rgba(214, 183, 154, 0.55)',
          background: 'rgba(255, 253, 248, 0.92)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'grid', gap: 4 }}>
          <strong style={{ fontSize: 14, color: 'var(--accent)' }}>
            {uiCopy.words.page.eyebrow}
          </strong>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>
            {uiCopy.words.page.description}
          </span>
        </div>
        <Link
          href={backHref}
          style={{
            width: 'fit-content',
            padding: '10px 16px',
            borderRadius: 999,
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
            fontWeight: 700,
            background: 'var(--surface)',
          }}
        >
          {backLabel}
        </Link>
      </header>
      <WordList backHref={backHref} backLabel={backLabel} />
    </main>
  );
}
