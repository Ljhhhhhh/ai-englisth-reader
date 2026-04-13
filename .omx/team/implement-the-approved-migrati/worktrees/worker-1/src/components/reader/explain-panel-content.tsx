import type { ReaderExplainMode } from '@/features/reader/reader-explain-utils';
import { LlmLoadingCard } from '@/components/system/llm-loading-card';
import { uiCopy } from '@/lib/ui-copy';

export type ExplainPanelSuccessData = {
  mode: ReaderExplainMode;
  selectedText: string;
  meaning: string;
  contextMeaning: string;
  explanation: string;
  phraseType?: string;
  usageExample?: string;
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

function sectionCardStyle(background: string) {
  return {
    display: 'grid',
    gap: 8,
    padding: 18,
    borderRadius: 20,
    background,
    border: '1px solid rgba(197, 106, 45, 0.10)',
  } as const;
}

function renderSection(title: string, body: string, background: string) {
  return (
    <div style={sectionCardStyle(background)}>
      <strong>{title}</strong>
      <p
        style={{
          margin: 0,
          color: 'var(--muted)',
          lineHeight: 1.7,
        }}
      >
        {body}
      </p>
    </div>
  );
}

function renderAnchorNote(title: string, body: string) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 4,
        padding: '12px 14px',
        borderRadius: 16,
        background: 'rgba(197, 106, 45, 0.08)',
        border: '1px solid rgba(197, 106, 45, 0.12)',
      }}
    >
      <strong style={{ fontSize: 12, letterSpacing: '0.04em' }}>{title}</strong>
      <p
        style={{
          margin: 0,
          color: 'var(--muted)',
          lineHeight: 1.65,
          fontSize: 14,
        }}
      >
        {body}
      </p>
    </div>
  );
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
  const isSuccess = state.status === 'success';
  const memoryExampleTitle = uiCopy.reader.explainPanel.wordUsage;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div
        style={{
          display: 'grid',
          gap: 8,
          paddingBottom: 14,
          borderBottom: '1px solid rgba(214, 183, 154, 0.55)',
        }}
      >
        <p
          style={{
            margin: 0,
            color: 'var(--accent)',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.08em',
          }}
        >
          {getPanelTitle(mode)}
        </p>
        <strong
          style={{
            fontSize: 26,
            lineHeight: 1.2,
            overflowWrap: 'anywhere',
          }}
        >
          {getPanelSelectedText(state)}
        </strong>
        {isSuccess && state.data.lemma ? (
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
          <div style={sectionCardStyle('#fff8ee')}>
            <strong>{uiCopy.reader.explainPanel.errorTitle}</strong>
            <p
              style={{
                margin: 0,
                color: '#9a3412',
                lineHeight: 1.7,
              }}
            >
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
              width: '100%',
            }}
          >
            {uiCopy.reader.explainPanel.retry}
          </button>
        </>
      ) : null}

      {isSuccess ? (
        <>
          {renderSection(
            mode === 'word'
              ? uiCopy.reader.explainPanel.wordMeaning
              : uiCopy.reader.explainPanel.phraseMeaning,
            state.data.meaning,
            '#fcf6ee',
          )}

          {renderAnchorNote(
            uiCopy.reader.explainPanel.contextMeaning,
            state.data.contextMeaning,
          )}

          {mode === 'word' && state.data.memoryHook
            ? renderSection(
                uiCopy.reader.explainPanel.wordMemory,
                state.data.memoryType
                  ? `${state.data.memoryType} · ${state.data.memoryHook}`
                  : state.data.memoryHook,
                '#fff8ee',
              )
            : null}

          {state.data.usageExample
            ? renderSection(
                memoryExampleTitle,
                state.data.usageExample,
                '#fffaf2',
              )
            : mode === 'phrase'
              ? renderSection(
                  uiCopy.reader.explainPanel.sourceSentence,
                  state.data.sourceSentence,
                  '#fffaf2',
                )
              : null}

          {renderSection(
            mode === 'word'
              ? uiCopy.reader.explainPanel.wordExplanation
              : uiCopy.reader.explainPanel.phraseExplanation,
            state.data.explanation,
            '#fff8ee',
          )}

          {saveEnabled ? (
            <div style={{ display: 'grid', gap: 10, paddingTop: 4 }}>
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
                  width: '100%',
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
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
