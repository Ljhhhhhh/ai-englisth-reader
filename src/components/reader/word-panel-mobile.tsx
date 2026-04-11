import {
  ExplainPanelContent,
  type ExplainPanelViewState,
} from '@/components/reader/explain-panel-content';
import { uiCopy } from '@/lib/ui-copy';

type WordPanelMobileProps = {
  onClose: () => void;
  onRetry: () => void;
  onToggleSave: () => void;
  remembered?: boolean;
  saved: boolean;
  saveEnabled: boolean;
  saveErrorMessage?: string | null;
  state: ExplainPanelViewState;
};

export function WordPanelMobile({
  onClose,
  onRetry,
  onToggleSave,
  remembered = false,
  saved,
  saveEnabled,
  saveErrorMessage,
  state,
}: WordPanelMobileProps) {
  return (
    <div
      aria-label={uiCopy.reader.explainPanel.ariaLabelMobile}
      style={{
        position: 'fixed',
        inset: 'auto 0 0 0',
        zIndex: 10,
        padding: '16px 16px 24px',
        background: 'rgba(31, 41, 55, 0.2)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          padding: 22,
          borderRadius: '24px 24px 0 0',
          background: '#fffdf8',
          border: '1px solid rgba(214, 183, 154, 0.72)',
          maxHeight: 'min(78vh, calc(100vh - 24px))',
          overflow: 'hidden',
          boxShadow: '0 -20px 40px rgba(31, 41, 55, 0.18)',
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
        <div style={{ overflowY: 'auto', paddingRight: 6, paddingBottom: 4 }}>
          <ExplainPanelContent
            onRetry={onRetry}
            onToggleSave={onToggleSave}
            remembered={remembered}
            saveEnabled={saveEnabled}
            saveErrorMessage={saveErrorMessage}
            saved={saved}
            state={state}
          />
        </div>
      </section>
    </div>
  );
}
