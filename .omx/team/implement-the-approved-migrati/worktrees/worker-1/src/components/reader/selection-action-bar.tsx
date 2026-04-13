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

function actionButtonStyle({
  priority = 'secondary',
  block = false,
}: {
  priority?: 'primary' | 'secondary' | 'ghost';
  block?: boolean;
}) {
  const shared = {
    width: block ? '100%' : 'fit-content',
    borderRadius: 999,
    padding: '11px 16px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'transform 120ms ease, background 120ms ease',
  } as const;

  if (priority === 'primary') {
    return {
      ...shared,
      border: 'none',
      background: 'var(--accent)',
      color: '#fff',
      boxShadow: '0 10px 24px rgba(197, 106, 45, 0.18)',
    } as const;
  }

  if (priority === 'ghost') {
    return {
      ...shared,
      border: '1px solid rgba(122, 95, 63, 0.16)',
      background: 'transparent',
      color: 'var(--muted)',
    } as const;
  }

  return {
    ...shared,
    border: '1px solid rgba(197, 106, 45, 0.18)',
    background: '#fff',
    color: 'var(--foreground)',
  } as const;
}

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
      data-selection-action-bar="true"
      style={{
        display: 'grid',
        gap: 14,
        padding: 16,
        borderRadius: 22,
        border: '1px solid rgba(197, 106, 45, 0.14)',
        background:
          'linear-gradient(180deg, rgba(255,250,242,0.96) 0%, rgba(255,246,235,0.98) 100%)',
        boxShadow: '0 16px 32px rgba(104, 71, 33, 0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--accent)',
            }}
          >
            {labels.title}
          </span>
          <strong
            style={{
              fontSize: 18,
              lineHeight: 1.35,
              overflowWrap: 'anywhere',
            }}
          >
            {selectedText}
          </strong>
        </div>
        <button type="button" onClick={onClear} disabled={isBusy} style={actionButtonStyle({ priority: 'ghost' })}>
          {labels.clear}
        </button>
      </div>

      {busyLabel ? (
        <div className="llm-busy-note" aria-live="polite">
          <span className="llm-busy-button__dot" aria-hidden="true" />
          {busyLabel}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 10 }}>
        {showExplainWord ? (
          <button
            type="button"
            onClick={onExplainWord}
            disabled={isBusy}
            className={isBusy ? 'llm-busy-button' : undefined}
            style={actionButtonStyle({ priority: 'primary', block: true })}
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
            style={actionButtonStyle({ priority: 'primary', block: true })}
          >
            {labels.explainPhrase}
          </button>
        ) : null}

        {canExpandLeft || canExpandRight ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {canExpandLeft ? (
              <button
                type="button"
                onClick={onExpandLeft}
                disabled={isBusy}
                style={actionButtonStyle({ priority: 'secondary' })}
              >
                {labels.expandLeft}
              </button>
            ) : null}
            {canExpandRight ? (
              <button
                type="button"
                onClick={onExpandRight}
                disabled={isBusy}
                style={actionButtonStyle({ priority: 'secondary' })}
              >
                {labels.expandRight}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
