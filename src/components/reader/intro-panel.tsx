import type { Article } from '@/lib/content/article-schema';
import { SentenceNote } from '@/components/reader/sentence-note';

type IntroPanelProps = {
  article: Article;
  onStartReading: () => void;
};

export function IntroPanel({ article, onStartReading }: IntroPanelProps) {
  return (
    <section
      aria-label="Intro panel"
      style={{
        display: 'grid',
        gap: 24,
        padding: 24,
        borderRadius: 24,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 600 }}>
          Warm up before you read
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>
          {article.title}
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          {article.summary}
        </p>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          {article.difficulty} · {article.estimatedMinutes} min ·{' '}
          {article.source}
        </p>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        <section>
          <h2 style={{ marginTop: 0 }}>Key vocabulary</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {article.vocabulary.map((word) => (
              <div
                key={word.lemma}
                style={{ padding: 16, borderRadius: 18, background: '#fcf6ee' }}
              >
                <strong>{word.surface}</strong>
                <div style={{ color: 'var(--muted)', marginTop: 6 }}>
                  {word.meaning}
                  {word.phonetic ? ` · ${word.phonetic}` : ''}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>Grammar points</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {article.grammarPoints.map((point) => (
              <div
                key={point.title}
                style={{ padding: 16, borderRadius: 18, background: '#fff8ee' }}
              >
                <strong>{point.title}</strong>
                <p
                  style={{
                    marginBottom: 0,
                    color: 'var(--muted)',
                    lineHeight: 1.6,
                  }}
                >
                  {point.explanation}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>Difficult sentences</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {article.difficultSentences.map((sentence) => (
              <SentenceNote
                key={sentence.sentenceId}
                body={sentence.breakdown}
                label={sentence.sentenceId}
                title="Sentence note"
              />
            ))}
          </div>
        </section>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button
          type="button"
          onClick={onStartReading}
          style={{
            borderRadius: 999,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            padding: '14px 20px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Start reading the article
        </button>
      </div>
    </section>
  );
}
