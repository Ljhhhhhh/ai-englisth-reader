import type { WordLookupResult } from '@/features/reader/word-lookup-service';

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
      aria-label="Word details popover"
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
          Word details
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
          Close
        </button>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: 28 }}>{word.surface}</h2>
        <div style={{ color: 'var(--muted)' }}>
          {word.lemma}
          {word.phonetic ? ` · ${word.phonetic}` : ''}
        </div>
      </div>

      <div style={{ padding: 16, borderRadius: 18, background: '#fcf6ee' }}>
        <strong>Meaning</strong>
        <p style={{ marginBottom: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
          {word.meaning}
        </p>
      </div>

      <div style={{ padding: 16, borderRadius: 18, background: '#fff8ee' }}>
        <strong>Source sentence</strong>
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
          ? 'Saved to this device'
          : errorMessage
            ? 'Retry save'
            : 'Save word'}
      </button>

      {errorMessage ? (
        <p style={{ margin: 0, color: '#9a3412', lineHeight: 1.6 }}>
          {errorMessage}
        </p>
      ) : null}
    </aside>
  );
}
