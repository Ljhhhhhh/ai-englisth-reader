export type LlmDebugCallType = 'generate' | 'word' | 'phrase';

export type LlmDebugTrigger = 'generate_page' | 'reader_panel';

export type LlmDebugErrorStage =
  | 'llm_invoke'
  | 'structured_output'
  | 'post_process'
  | 'route';

export type LlmDebugStructuredStatus = 'success' | 'parse_failed' | 'missing';

export type LlmDebugSummary = {
  callType: LlmDebugCallType;
  model: string;
  selectedText?: string;
  sentenceId?: string;
  sourceRefLabel?: string;
  sourceType?: 'url' | 'file';
  trigger: LlmDebugTrigger;
};

export type LlmDebugRecord = {
  callId: string;
  error: {
    message: string;
    stage: LlmDebugErrorStage;
  } | null;
  meta: {
    attempt?: number;
    durationMs: number;
  };
  rawOutput: {
    available: boolean;
    preview: string | null;
    truncated: boolean;
  };
  status: 'success' | 'failed';
  structuredResult: {
    data: unknown | null;
    status: LlmDebugStructuredStatus;
  };
  summary: LlmDebugSummary;
  timestamp: string;
};

export type LlmDebugEnvelope = {
  llmDebug?: LlmDebugRecord | null;
};
