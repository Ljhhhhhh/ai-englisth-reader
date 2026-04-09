import type { WordLookupResult } from '@/features/reader/word-lookup-service';
import { uiCopy } from '@/lib/ui-copy';

type WordPanelDesktopProps = {
  errorMessage?: string | null;
  onClose: () => void;
  onToggleSave: () => void;
  saved: boolean;
  word: WordLookupResult;
};

export function WordPanelDesktop({
  errorMessage,
  onClose,
  onToggleSave,
  saved,
  word,
}: WordPanelDesktopProps) {
  return (
    <aside
      aria-label={uiCopy.reader.wordPanel.ariaLabelDesktop}
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 20,
        display: 'grid',
        gap: 16,
        padding: 20,
        borderRadius: 24,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        width: 'min(420px, calc(100vw - 40px))',
        boxShadow: '0 18px 40px rgba(104, 71, 33, 0.08)',
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
        <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 600 }}>
          {uiCopy.reader.wordPanel.title}
        </p>
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

      <div style={{ display: 'grid', gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>{word.surface}</h2>
        <div style={{ color: 'var(--muted)' }}>{word.lemma}</div>
      </div>

      <div style={{ padding: 16, borderRadius: 18, background: '#fcf6ee' }}>
        <strong>{uiCopy.reader.wordPanel.meaning}</strong>
        <p style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          {word.chineseMeaning}
        </p>
      </div>

      <div style={{ padding: 16, borderRadius: 18, background: '#fffaf2' }}>
        <strong>{uiCopy.reader.wordPanel.contextMeaning}</strong>
        <p style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          {word.contextMeaning}
        </p>
      </div>

      <div style={{ padding: 16, borderRadius: 18, background: '#fff8ee' }}>
        <strong>{uiCopy.reader.wordPanel.memoryHook}</strong>
        <p style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          {word.memoryType} · {word.memoryHook}
        </p>
      </div>

      <div style={{ padding: 16, borderRadius: 18, background: '#fff8ee' }}>
        <strong>{uiCopy.reader.wordPanel.sourceSentence}</strong>
        <p style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
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
          padding: '14px 20px',
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
    </aside>
  );
}
