import {
  ExplainPanelContent,
  type ExplainPanelViewState,
} from '@/components/reader/explain-panel-content';
import { uiCopy } from '@/lib/ui-copy';

type WordPanelDesktopProps = {
  onClose: () => void;
  onRetry: () => void;
  onToggleSave: () => void;
  saved: boolean;
  saveEnabled: boolean;
  saveErrorMessage?: string | null;
  state: ExplainPanelViewState;
};

export function WordPanelDesktop({
  onClose,
  onRetry,
  onToggleSave,
  saved,
  saveEnabled,
  saveErrorMessage,
  state,
}: WordPanelDesktopProps) {
  return (
    <aside
      aria-label={uiCopy.reader.explainPanel.ariaLabelDesktop}
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 20,
        borderRadius: 24,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        width: 'min(420px, calc(100vw - 40px))',
        maxHeight: 'min(80vh, calc(100vh - 40px))',
        overflow: 'hidden',
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
      <div style={{ overflowY: 'auto', paddingRight: 4 }}>
        <ExplainPanelContent
          onRetry={onRetry}
          onToggleSave={onToggleSave}
          saveEnabled={saveEnabled}
          saveErrorMessage={saveErrorMessage}
          saved={saved}
          state={state}
        />
      </div>
    </aside>
  );
}
