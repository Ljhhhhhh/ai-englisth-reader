import type { Article } from '@/lib/content/article-schema';
import { formatEstimatedMinutes, uiCopy } from '@/lib/ui-copy';
import { SentenceNote } from '@/components/reader/sentence-note';

type IntroPanelProps = {
  article: Article;
  onStartReading: () => void;
};

export function IntroPanel({ article, onStartReading }: IntroPanelProps) {
  const sentenceMap = new Map(
    article.paragraphs.flatMap((paragraph) =>
      paragraph.sentences.map(
        (sentence) => [sentence.id, sentence.text] as const,
      ),
    ),
  );

  return (
    <section
      aria-label={uiCopy.reader.intro.ariaLabel}
      style={{
        display: 'grid',
        gap: 20,
        padding: 24,
        borderRadius: 24,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>
          {article.title}
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          {article.difficulty} ·{' '}
          {formatEstimatedMinutes(article.estimatedMinutes)} · {article.source}
        </p>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        <section>
          <h2 style={{ marginTop: 0 }}>
            {uiCopy.reader.intro.vocabularyTitle}
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {article.vocabulary.map((word) => (
              <div
                key={word.lemma}
                style={{
                  padding: 18,
                  borderRadius: 18,
                  background: '#fcf6ee',
                  border: '1px solid rgba(197,106,45,0.12)',
                }}
              >
                <strong style={{ fontSize: 20 }}>{word.surface}</strong>
                <div style={{ color: 'var(--muted)', marginTop: 6 }}>
                  {word.meaning}
                  {word.phonetic ? ` · ${word.phonetic}` : ''}
                </div>
                <p
                  style={{
                    marginBottom: 0,
                    color: 'var(--muted)',
                    lineHeight: 1.7,
                  }}
                >
                  {sentenceMap.get(word.exampleSentenceId)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>{uiCopy.reader.intro.grammarTitle}</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {article.grammarPoints.map((point) => (
              <div
                key={point.title}
                style={{
                  padding: 18,
                  borderRadius: 18,
                  background: '#fff8ee',
                  border: '1px solid rgba(214,183,154,0.6)',
                }}
              >
                <strong>{point.title}</strong>
                <p
                  style={{
                    marginTop: 8,
                    marginBottom: 10,
                    color: 'var(--foreground)',
                    lineHeight: 1.7,
                  }}
                >
                  {sentenceMap.get(point.sourceSentenceId)}
                </p>
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
          <h2>{uiCopy.reader.intro.difficultTitle}</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {article.difficultSentences.map((sentence) => (
              <SentenceNote
                key={sentence.sentenceId}
                body={sentence.breakdown}
                label={
                  sentenceMap.get(sentence.sentenceId) ?? sentence.sentenceId
                }
                title={uiCopy.reader.intro.sentenceBreakdown}
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
          {uiCopy.reader.intro.button}
        </button>
      </div>
    </section>
  );
}
