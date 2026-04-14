import {
  ExplainPanelContent,
  type ExplainPanelViewState,
} from '@/components/reader/explain-panel-content';
import type { LlmDebugRecord } from '@/features/llm-debug/debug-types';
import { uiCopy } from '@/lib/ui-copy';

type WordPanelDesktopProps = {
  onClose: () => void;
  onRetry: () => void;
  onToggleSave: () => void;
  remembered?: boolean;
  saved: boolean;
  saveEnabled: boolean;
  saveErrorMessage?: string | null;
  state: ExplainPanelViewState;
  llmDebug?: LlmDebugRecord | null;
};

export function WordPanelDesktop({
  onClose,
  onRetry,
  onToggleSave,
  remembered = false,
  saved,
  saveEnabled,
  saveErrorMessage,
  state,
  llmDebug,
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
        gap: 18,
        padding: 22,
        borderRadius: 28,
        border: '1px solid rgba(214, 183, 154, 0.72)',
        background: '#fffdf8',
        width: 'min(448px, calc(100vw - 40px))',
        maxHeight: 'min(80vh, calc(100vh - 40px))',
        overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(104, 71, 33, 0.12)',
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
      <div style={{ overflowY: 'auto', paddingRight: 6, paddingBottom: 4 }}>
        <ExplainPanelContent
          llmDebug={llmDebug}
          onRetry={onRetry}
          onToggleSave={onToggleSave}
          remembered={remembered}
          saveEnabled={saveEnabled}
          saveErrorMessage={saveErrorMessage}
          saved={saved}
          state={state}
        />
      </div>
    </aside>
  );
}
