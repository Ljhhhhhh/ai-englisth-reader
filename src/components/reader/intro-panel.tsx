import type { Article } from '@/lib/content/article-schema';
import { SentenceNote } from '@/components/reader/sentence-note';

type IntroPanelProps = {
  article: Article;
  onStartReading: () => void;
};

export function IntroPanel({ article, onStartReading }: IntroPanelProps) {
  const sentenceMap = new Map(
    article.paragraphs.flatMap((paragraph) =>
      paragraph.sentences.map((sentence) => [sentence.id, sentence.text] as const),
    ),
  );

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
          Learn the key ideas first
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>
          {article.title}
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          Use this page to lock in the words, grammar, and hard sentences
          before you move into the article itself.
        </p>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          {article.difficulty} · {article.estimatedMinutes} min ·{' '}
          {article.source}
        </p>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        <section>
          <h2 style={{ marginTop: 0 }}>Key vocabulary</h2>
          <p style={{ marginTop: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
            Focus on the words that matter most in the article before you start
            reading for flow.
          </p>
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
          <h2>Grammar points</h2>
          <p style={{ marginTop: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
            Each grammar note is tied to a real sentence from the article so
            you know exactly where to look for it later.
          </p>
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
          <h2>Difficult sentences</h2>
          <p style={{ marginTop: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
            Break down the toughest sentence patterns here, then watch them feel
            easier when you meet them again in the article.
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            {article.difficultSentences.map((sentence) => (
              <SentenceNote
                key={sentence.sentenceId}
                body={sentence.breakdown}
                label={sentenceMap.get(sentence.sentenceId) ?? sentence.sentenceId}
                title="Sentence breakdown"
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
          Start consolidating in the article
        </button>
      </div>
    </section>
  );
}
