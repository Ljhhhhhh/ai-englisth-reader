import type { ReaderPhraseSuggestion } from '@/features/reader/reader-phrase-suggestions';
import { uiCopy } from '@/lib/ui-copy';

type MobileExplainAssistProps = {
  word: string;
  suggestions: ReaderPhraseSuggestion[];
  onClose: () => void;
  onExplainWord: () => void;
  onExplainPhrase: (text: string) => void;
};

export function MobileExplainAssist({
  word,
  suggestions,
  onClose,
  onExplainWord,
  onExplainPhrase,
}: MobileExplainAssistProps) {
  return (
    <div
      aria-label={uiCopy.reader.mobileAssist.ariaLabel}
      style={{
        position: 'fixed',
        inset: 'auto 12px 12px 12px',
        zIndex: 25,
        padding: 16,
        borderRadius: 22,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        boxShadow: '0 18px 40px rgba(31, 41, 55, 0.18)',
        display: 'grid',
        gap: 12,
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
        <div style={{ display: 'grid', gap: 4 }}>
          <strong>{uiCopy.reader.mobileAssist.title}</strong>
          <span style={{ color: 'var(--muted)' }}>
            {uiCopy.reader.mobileAssist.selectedWord(word)}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 999,
            background: 'transparent',
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          {uiCopy.common.close}
        </button>
      </div>

      <button
        type="button"
        onClick={onExplainWord}
        style={{
          borderRadius: 16,
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          padding: '14px 16px',
          textAlign: 'left',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {uiCopy.reader.mobileAssist.explainWord}
      </button>

      {suggestions.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <strong>{uiCopy.reader.mobileAssist.suggestionsTitle}</strong>
          <div style={{ display: 'grid', gap: 8 }}>
            {suggestions.map((item) => (
              <button
                key={item.text}
                type="button"
                onClick={() => onExplainPhrase(item.text)}
                style={{
                  borderRadius: 16,
                  border: '1px solid #e8d5bf',
                  background: '#fffaf2',
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'grid',
                  gap: 2,
                }}
              >
                <strong style={{ fontSize: 14 }}>{item.text}</strong>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {item.reason}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
          {uiCopy.reader.mobileAssist.noSuggestions}
        </p>
      )}
    </div>
  );
}
