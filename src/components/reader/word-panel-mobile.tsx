import type { WordLookupResult } from '@/features/reader/word-lookup-service';
import { uiCopy } from '@/lib/ui-copy';

type WordPanelMobileProps = {
  errorMessage?: string | null;
  onClose: () => void;
  onToggleSave: () => void;
  saved: boolean;
  word: WordLookupResult;
};

export function WordPanelMobile({
  errorMessage,
  onClose,
  onToggleSave,
  saved,
  word,
}: WordPanelMobileProps) {
  return (
    <div
      aria-label={uiCopy.reader.wordPanel.ariaLabelMobile}
      style={{
        position: 'fixed',
        inset: 'auto 0 0 0',
        zIndex: 10,
        padding: '16px 16px 24px',
        background: 'rgba(31, 41, 55, 0.18)',
      }}
    >
      <section
        style={{
          display: 'grid',
          gap: 16,
          padding: 20,
          borderRadius: '24px 24px 0 0',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 -20px 40px rgba(31, 41, 55, 0.16)',
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
            <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 600 }}>
              {uiCopy.reader.wordPanel.title}
            </p>
            <strong style={{ fontSize: 24 }}>{word.surface}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 999,
              background: 'transparent',
              padding: '10px 14px',
              cursor: 'pointer',
            }}
          >
            {uiCopy.common.close}
          </button>
        </div>

        <p style={{ margin: 0, color: 'var(--muted)' }}>{word.lemma}</p>

        <div style={{ padding: 16, borderRadius: 18, background: '#fcf6ee' }}>
          <strong>{uiCopy.reader.wordPanel.meaning}</strong>
          <p
            style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.7 }}
          >
            {word.chineseMeaning}
          </p>
        </div>

        <div style={{ padding: 16, borderRadius: 18, background: '#fffaf2' }}>
          <strong>{uiCopy.reader.wordPanel.contextMeaning}</strong>
          <p
            style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.7 }}
          >
            {word.contextMeaning}
          </p>
        </div>

        <div style={{ padding: 16, borderRadius: 18, background: '#fff8ee' }}>
          <strong>{uiCopy.reader.wordPanel.memoryHook}</strong>
          <p
            style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.7 }}
          >
            {word.memoryType} · {word.memoryHook}
          </p>
        </div>

        <div style={{ padding: 16, borderRadius: 18, background: '#fff8ee' }}>
          <strong>{uiCopy.reader.wordPanel.sourceSentence}</strong>
          <p
            style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.7 }}
          >
            {word.sourceSentence}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleSave}
          style={{
            borderRadius: 999,
            border: 'none',
            background: saved ? '#1f6f50' : 'var(--accent)',
            color: '#fff',
            padding: '16px 20px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {saved
            ? uiCopy.reader.wordPanel.saved
            : errorMessage
              ? uiCopy.reader.wordPanel.retrySave
              : uiCopy.reader.wordPanel.save}
        </button>

        {errorMessage ? (
          <p style={{ margin: 0, color: '#9a3412', lineHeight: 1.6 }}>
            {errorMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
}
