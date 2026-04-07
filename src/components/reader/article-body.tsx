import type { Article } from '@/lib/content/article-schema';

function normalizeToken(value: string) {
  return value.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase();
}

function tokenizeSentence(text: string) {
  return text.match(/[A-Za-z']+|[^A-Za-z']+/g) ?? [text];
}

type ArticleBodyProps = {
  activeParagraphId?: string;
  article: Article;
  lookupableWords: Set<string>;
  onContinueToQuiz: () => void;
  onFocusParagraph: (paragraphId: string) => void;
  onLookupWord: (input: { sentenceId: string; surface: string }) => void;
};

export function ArticleBody({
  activeParagraphId,
  article,
  lookupableWords,
  onContinueToQuiz,
  onFocusParagraph,
  onLookupWord,
}: ArticleBodyProps) {
  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <header style={{ display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 600 }}>
          Read in context
        </p>
        <h1 style={{ margin: 0 }}>{article.title}</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          Current paragraph: {activeParagraphId ?? article.paragraphs[0]?.id}
        </p>
      </header>

      <div style={{ display: 'grid', gap: 16 }}>
        {article.paragraphs.map((paragraph, index) => {
          const selected = activeParagraphId === paragraph.id;

          return (
            <article
              key={paragraph.id}
              style={{
                padding: 20,
                borderRadius: 22,
                border: selected
                  ? '1px solid var(--accent)'
                  : '1px solid var(--border)',
                background: selected ? '#fff8ee' : 'var(--surface)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <strong>Paragraph {index + 1}</strong>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onFocusParagraph(paragraph.id)}
                  style={{
                    borderRadius: 999,
                    border: selected
                      ? '1px solid var(--accent)'
                      : '1px solid var(--border)',
                    background: selected ? 'var(--accent)' : 'transparent',
                    color: selected ? '#fff' : 'var(--foreground)',
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  Jump to paragraph {index + 1}
                </button>
              </div>

              <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                {paragraph.sentences.map((sentence) => (
                  <p
                    key={sentence.id}
                    style={{ margin: 0, lineHeight: 1.8, fontSize: 18 }}
                  >
                    {tokenizeSentence(sentence.text).map(
                      (token, tokenIndex) => {
                        const normalizedToken = normalizeToken(token);
                        const canLookup = lookupableWords.has(normalizedToken);

                        if (!canLookup) {
                          return (
                            <span key={`${sentence.id}-${tokenIndex}`}>
                              {token}
                            </span>
                          );
                        }

                        return (
                          <button
                            key={`${sentence.id}-${tokenIndex}`}
                            type="button"
                            onClick={() =>
                              onLookupWord({
                                sentenceId: sentence.id,
                                surface: token,
                              })
                            }
                            style={{
                              border: 'none',
                              padding: 0,
                              background: 'transparent',
                              color: 'var(--accent)',
                              cursor: 'pointer',
                              font: 'inherit',
                              textDecoration: 'underline',
                              textUnderlineOffset: 3,
                            }}
                          >
                            {token}
                          </button>
                        );
                      },
                    )}
                  </p>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          Reading position is saved automatically on this device.
        </p>
        <button
          type="button"
          onClick={onContinueToQuiz}
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
          Continue to quiz stage
        </button>
      </div>
    </section>
  );
}
