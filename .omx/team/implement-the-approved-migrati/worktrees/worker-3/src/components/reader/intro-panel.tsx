import type { Article } from '@/lib/content/article-schema';
import { formatEstimatedMinutes, uiCopy } from '@/lib/ui-copy';

type IntroPanelProps = {
  article: Article;
  onRememberPhrase?: (phrase: string) => void;
  onRememberWord?: (word: string) => void;
  onSaveWord?: (word: string) => void;
  onStartReading: () => void;
  rememberedPhrases?: string[];
  rememberedWords?: string[];
  savedWords?: string[];
  savingWords?: string[];
};

function normalizeTerm(value: string) {
  return value.trim().toLowerCase();
}

function actionButtonStyle(background: string, disabled = false) {
  return {
    borderRadius: 999,
    border: 'none',
    background,
    color: '#fff',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.88 : 1,
  } as const;
}

export function IntroPanel({
  article,
  onRememberPhrase = () => {},
  onRememberWord = () => {},
  onSaveWord = () => {},
  onStartReading,
  rememberedPhrases = [],
  rememberedWords = [],
  savedWords = [],
  savingWords = [],
}: IntroPanelProps) {
  const rememberedWordSet = new Set(rememberedWords.map(normalizeTerm));
  const rememberedPhraseSet = new Set(rememberedPhrases.map(normalizeTerm));
  const savedWordSet = new Set(savedWords.map(normalizeTerm));
  const savingWordSet = new Set(savingWords.map(normalizeTerm));

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
            {article.growth_vocabulary.map((word) => {
              const normalizedWord = normalizeTerm(word.word);
              const isRemembered = rememberedWordSet.has(normalizedWord);
              const isSaved = savedWordSet.has(normalizedWord);
              const isSaving = savingWordSet.has(normalizedWord);

              return (
                <div
                  key={word.word}
                  style={{
                    padding: 18,
                    borderRadius: 18,
                    background: isRemembered ? '#f3f0ea' : '#fcf6ee',
                    border: '1px solid rgba(197,106,45,0.12)',
                  }}
                >
                  <strong style={{ fontSize: 20 }}>{word.word}</strong>
                  <div style={{ color: 'var(--muted)', marginTop: 6 }}>
                    {word.chinese_meaning}
                  </div>
                  <p
                    style={{
                      marginTop: 10,
                      marginBottom: 10,
                      color: 'var(--foreground)',
                      lineHeight: 1.7,
                    }}
                  >
                    {word.context_meaning}
                  </p>
                  <p
                    style={{
                      marginBottom: 0,
                      color: 'var(--muted)',
                      lineHeight: 1.7,
                      fontSize: 14,
                    }}
                  >
                    {word.memory_type} · {word.memory_hook}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                      marginTop: 14,
                    }}
                  >
                    {isRemembered ? (
                      <button
                        type="button"
                        onClick={() => onSaveWord(word.word)}
                        disabled={isSaving}
                        style={actionButtonStyle('var(--accent)')}
                      >
                        {isSaving ? uiCopy.reader.explainPanel.saving : uiCopy.reader.explainPanel.readd}
                      </button>
                    ) : isSaved ? (
                      <button
                        type="button"
                        disabled
                        style={actionButtonStyle('#1f6f50', true)}
                      >
                        {uiCopy.reader.explainPanel.saved}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSaveWord(word.word)}
                        disabled={isSaving}
                        style={actionButtonStyle('var(--accent)', isSaving)}
                      >
                        {isSaving ? uiCopy.reader.explainPanel.saving : uiCopy.reader.explainPanel.save}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onRememberWord(word.word)}
                      disabled={isRemembered}
                      style={actionButtonStyle(
                        isRemembered ? '#6b7280' : '#7c5a3c',
                        isRemembered,
                      )}
                    >
                      {uiCopy.reader.explainPanel.remembered}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2>{uiCopy.reader.intro.highFrequencyPhrasesTitle}</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {article.high_frequency_phrases.map((phrase) => {
              const isRemembered = rememberedPhraseSet.has(
                normalizeTerm(phrase.phrase),
              );

              return (
                <div
                  key={phrase.phrase}
                  style={{
                    padding: 18,
                    borderRadius: 18,
                    background: isRemembered ? '#f4f1eb' : '#fff8ee',
                    border: '1px solid rgba(214,183,154,0.6)',
                    opacity: isRemembered ? 0.78 : 1,
                  }}
                >
                  <strong>{phrase.phrase}</strong>
                  <p
                    style={{
                      marginTop: 8,
                      marginBottom: 10,
                      color: 'var(--foreground)',
                      lineHeight: 1.7,
                    }}
                  >
                    {phrase.chinese_meaning}
                  </p>
                  <p
                    style={{
                      marginBottom: 0,
                      color: 'var(--muted)',
                      lineHeight: 1.6,
                    }}
                  >
                    {phrase.usage_note}
                  </p>
                  <div style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={() => onRememberPhrase(phrase.phrase)}
                      disabled={isRemembered}
                      style={actionButtonStyle(
                        isRemembered ? '#6b7280' : '#7c5a3c',
                        isRemembered,
                      )}
                    >
                      {uiCopy.reader.explainPanel.remembered}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2>{uiCopy.reader.intro.grammarTitle}</h2>
          <div
            style={{
              display: 'grid',
              gap: 12,
              padding: 18,
              borderRadius: 18,
              background: '#fff8ee',
              border: '1px solid rgba(214,183,154,0.6)',
            }}
          >
            <strong>{article.language_evolution.target_structure}</strong>
            <p
              style={{
                margin: 0,
                color: 'var(--foreground)',
                lineHeight: 1.7,
              }}
            >
              {article.language_evolution.rewritten_sentence}
            </p>
            <p
              style={{
                margin: 0,
                color: 'var(--muted)',
                lineHeight: 1.6,
              }}
            >
              {article.language_evolution.explanation}
            </p>
            <p
              style={{
                margin: 0,
                color: 'var(--muted)',
                lineHeight: 1.6,
              }}
            >
              {article.language_evolution.imitation_example}
            </p>
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
