import Link from 'next/link';
import type { SavedWordRecord } from '@/features/words/saved-word-service';
import type { Article } from '@/lib/content/article-schema';
import { uiCopy } from '@/lib/ui-copy';

type ReviewPanelProps = {
  article: Article;
  nextArticleSlug?: string;
  savedWords: SavedWordRecord[];
};

export function ReviewPanel({
  article,
  nextArticleSlug,
  savedWords,
}: ReviewPanelProps) {
  return (
    <section
      style={{
        display: 'grid',
        gap: 20,
        padding: 24,
        borderRadius: 24,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <p style={{ margin: 0, color: 'var(--accent)', fontSize: 14 }}>
        {uiCopy.reader.review.title}
      </p>
      <div style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ margin: 0 }}>{uiCopy.reader.review.completionTitle}</h1>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          {uiCopy.reader.review.completionDescription}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 10,
          padding: 20,
          borderRadius: 20,
          background: '#fff8ee',
          border: '1px solid rgba(197,106,45,0.12)',
        }}
      >
        <strong>{uiCopy.reader.review.summaryTitle}</strong>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>
          {uiCopy.reader.review.summaryDescription}
        </div>
        <p style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          {article.summary}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 10,
          padding: 18,
          borderRadius: 20,
          background: '#fcf6ee',
        }}
      >
        <strong>{uiCopy.reader.review.translationTitle}</strong>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>
          {uiCopy.reader.review.translationDescription}
        </div>
        <p style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          {article.translation}
        </p>
      </div>

      <section style={{ display: 'grid', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'grid', gap: 4 }}>
            <strong>{uiCopy.reader.review.savedWordsTitle}</strong>
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>
              {savedWords.length
                ? uiCopy.reader.review.savedWordsHint
                : uiCopy.reader.review.emptySavedWordsHint}
            </div>
          </div>
          <Link
            href="/words"
            style={{ color: 'var(--accent)', fontWeight: 600 }}
          >
            {uiCopy.reader.review.savedWordsCta}
          </Link>
        </div>
        {savedWords.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {savedWords.map((word) => (
              <div
                key={`${word.articleSlug}-${word.lemma}`}
                style={{ padding: 16, borderRadius: 18, background: '#fffaf2' }}
              >
                <strong>{word.surface}</strong>
                <div style={{ color: 'var(--muted)', marginTop: 6 }}>
                  {word.meaning}
                </div>
                <p
                  style={{
                    marginBottom: 0,
                    color: 'var(--muted)',
                    lineHeight: 1.6,
                  }}
                >
                  {word.sourceSentence}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            {uiCopy.reader.review.emptySavedWords}
          </p>
        )}
      </section>

      {nextArticleSlug ? (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Link
            href={`/reader/${nextArticleSlug}`}
            style={{
              borderRadius: 999,
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 700,
              padding: '14px 20px',
            }}
          >
            {uiCopy.reader.review.nextArticle}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
