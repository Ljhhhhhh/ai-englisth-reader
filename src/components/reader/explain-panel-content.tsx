import type { ReaderExplainMode } from '@/features/reader/reader-explain-utils';
import { LlmLoadingCard } from '@/components/system/llm-loading-card';
import { uiCopy } from '@/lib/ui-copy';

export type ExplainPanelSuccessData = {
  mode: ReaderExplainMode;
  selectedText: string;
  meaning: string;
  contextMeaning: string;
  explanation: string;
  sourceSentence: string;
  lemma?: string;
  memoryHook?: string;
  memoryType?: string;
};

export type ExplainPanelViewState =
  | {
      status: 'loading';
      mode: ReaderExplainMode;
      selectedText: string;
    }
  | {
      status: 'error';
      mode: ReaderExplainMode;
      selectedText: string;
      message: string;
    }
  | {
      status: 'success';
      data: ExplainPanelSuccessData;
    };

type ExplainPanelContentProps = {
  onRetry: () => void;
  onToggleSave: () => void;
  remembered?: boolean;
  saveEnabled: boolean;
  saveErrorMessage?: string | null;
  saved: boolean;
  state: ExplainPanelViewState;
};

function getPanelMode(state: ExplainPanelViewState) {
  return state.status === 'success' ? state.data.mode : state.mode;
}

function getPanelSelectedText(state: ExplainPanelViewState) {
  return state.status === 'success'
    ? state.data.selectedText
    : state.selectedText;
}

function getPanelTitle(mode: ReaderExplainMode) {
  return mode === 'word'
    ? uiCopy.reader.explainPanel.wordTitle
    : uiCopy.reader.explainPanel.phraseTitle;
}

export function ExplainPanelContent({
  onRetry,
  onToggleSave,
  remembered = false,
  saveEnabled,
  saveErrorMessage,
  saved,
  state,
}: ExplainPanelContentProps) {
  const mode = getPanelMode(state);
  const loadingEyebrow =
    mode === 'word'
      ? uiCopy.reader.explainPanel.loadingWordEyebrow
      : uiCopy.reader.explainPanel.loadingPhraseEyebrow;
  const loadingDescription =
    mode === 'word'
      ? uiCopy.reader.explainPanel.loadingWord
      : uiCopy.reader.explainPanel.loadingPhrase;
  const loadingSteps =
    mode === 'word'
      ? uiCopy.reader.explainPanel.loadingWordSteps
      : uiCopy.reader.explainPanel.loadingPhraseSteps;

  return (
    <>
      <div style={{ display: 'grid', gap: 6 }}>
        <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 600 }}>
          {getPanelTitle(mode)}
        </p>
        <strong style={{ fontSize: 26 }}>{getPanelSelectedText(state)}</strong>
        {state.status === 'success' && state.data.lemma ? (
          <p style={{ margin: 0, color: 'var(--muted)' }}>{state.data.lemma}</p>
        ) : null}
      </div>

      {state.status === 'loading' ? (
        <LlmLoadingCard
          description={loadingDescription}
          eyebrow={loadingEyebrow}
          steps={loadingSteps}
          title={uiCopy.reader.explainPanel.loadingTitle}
        />
      ) : null}

      {state.status === 'error' ? (
        <>
          <div style={{ padding: 16, borderRadius: 18, background: '#fff8ee' }}>
            <strong>{uiCopy.reader.explainPanel.errorTitle}</strong>
            <p style={{ marginBottom: 0, color: '#9a3412', lineHeight: 1.7 }}>
              {state.message}
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
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
            {uiCopy.reader.explainPanel.retry}
          </button>
        </>
      ) : null}

      {state.status === 'success' ? (
        <>
          <div style={{ padding: 16, borderRadius: 18, background: '#fcf6ee' }}>
            <strong>
              {mode === 'word'
                ? uiCopy.reader.explainPanel.wordMeaning
                : uiCopy.reader.explainPanel.phraseMeaning}
            </strong>
            <p
              style={{
                marginBottom: 0,
                color: 'var(--muted)',
                lineHeight: 1.7,
              }}
            >
              {state.data.meaning}
            </p>
          </div>

          <div style={{ padding: 16, borderRadius: 18, background: '#fffaf2' }}>
            <strong>{uiCopy.reader.explainPanel.contextMeaning}</strong>
            <p
              style={{
                marginBottom: 0,
                color: 'var(--muted)',
                lineHeight: 1.7,
              }}
            >
              {state.data.contextMeaning}
            </p>
          </div>

          <div style={{ padding: 16, borderRadius: 18, background: '#fff8ee' }}>
            <strong>
              {mode === 'word'
                ? uiCopy.reader.explainPanel.wordExplanation
                : uiCopy.reader.explainPanel.phraseExplanation}
            </strong>
            <p
              style={{
                marginBottom: 0,
                color: 'var(--muted)',
                lineHeight: 1.7,
              }}
            >
              {state.data.explanation}
            </p>
          </div>

          {mode === 'word' && state.data.memoryHook ? (
            <div
              style={{ padding: 16, borderRadius: 18, background: '#fff8ee' }}
            >
              <strong>{uiCopy.reader.explainPanel.wordMemory}</strong>
              <p
                style={{
                  marginBottom: 0,
                  color: 'var(--muted)',
                  lineHeight: 1.7,
                }}
              >
                {state.data.memoryType
                  ? `${state.data.memoryType} · ${state.data.memoryHook}`
                  : state.data.memoryHook}
              </p>
            </div>
          ) : null}

          {mode === 'phrase' ? (
            <div
              style={{ padding: 16, borderRadius: 18, background: '#fff8ee' }}
            >
              <strong>{uiCopy.reader.explainPanel.sourceSentence}</strong>
              <p
                style={{
                  marginBottom: 0,
                  color: 'var(--muted)',
                  lineHeight: 1.7,
                }}
              >
                {state.data.sourceSentence}
              </p>
            </div>
          ) : null}

          {saveEnabled ? (
            <>
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
                  marginTop: 12,
                }}
              >
                {remembered
                  ? uiCopy.reader.explainPanel.readd
                  : saved
                  ? uiCopy.reader.explainPanel.saved
                  : saveErrorMessage
                    ? uiCopy.reader.explainPanel.retrySave
                    : uiCopy.reader.explainPanel.save}
              </button>

              {saveErrorMessage ? (
                <p style={{ margin: 0, color: '#9a3412', lineHeight: 1.6 }}>
                  {saveErrorMessage}
                </p>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}
