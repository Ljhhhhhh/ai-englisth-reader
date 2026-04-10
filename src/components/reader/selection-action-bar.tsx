type SelectionActionBarProps = {
  busyLabel?: string | null;
  selectedText: string;
  showExplainWord: boolean;
  canExplainPhrase: boolean;
  canExpandLeft: boolean;
  canExpandRight: boolean;
  isBusy?: boolean;
  onExplainWord: () => void;
  onExplainPhrase: () => void;
  onExpandLeft: () => void;
  onExpandRight: () => void;
  onClear: () => void;
  labels: {
    title: string;
    explainWord: string;
    explainPhrase: string;
    expandLeft: string;
    expandRight: string;
    clear: string;
  };
};

export function SelectionActionBar({
  busyLabel,
  selectedText,
  showExplainWord,
  canExplainPhrase,
  canExpandLeft,
  canExpandRight,
  isBusy = false,
  onExplainWord,
  onExplainPhrase,
  onExpandLeft,
  onExpandRight,
  onClear,
  labels,
}: SelectionActionBarProps) {
  return (
    <section
      aria-label={labels.title}
      role="group"
      style={{
        display: 'grid',
        gap: 10,
        padding: 12,
        borderRadius: 18,
        border: '1px solid var(--border)',
        background: '#fffaf2',
      }}
    >
      <strong>{selectedText}</strong>
      {busyLabel ? (
        <div className="llm-busy-note" aria-live="polite">
          <span className="llm-busy-button__dot" aria-hidden="true" />
          {busyLabel}
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {showExplainWord ? (
          <button
            type="button"
            onClick={onExplainWord}
            disabled={isBusy}
            className={isBusy ? 'llm-busy-button' : undefined}
          >
            {labels.explainWord}
          </button>
        ) : null}
        {canExplainPhrase ? (
          <button
            type="button"
            onClick={onExplainPhrase}
            disabled={isBusy}
            className={isBusy ? 'llm-busy-button' : undefined}
          >
            {labels.explainPhrase}
          </button>
        ) : null}
        {canExpandLeft ? (
          <button type="button" onClick={onExpandLeft} disabled={isBusy}>
            {labels.expandLeft}
          </button>
        ) : null}
        {canExpandRight ? (
          <button type="button" onClick={onExpandRight} disabled={isBusy}>
            {labels.expandRight}
          </button>
        ) : null}
        <button type="button" onClick={onClear} disabled={isBusy}>
          {labels.clear}
        </button>
      </div>
    </section>
  );
}
