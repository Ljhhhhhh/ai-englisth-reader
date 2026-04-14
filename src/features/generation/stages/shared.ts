import { randomUUID } from 'node:crypto';
import { env } from '@/lib/env';
import type {
  LlmDebugErrorStage,
  LlmDebugRecord,
  LlmDebugSummary,
} from '@/features/llm-debug/debug-types';
import {
  sanitizeDebugRawPreview,
  sanitizeDebugStructuredData,
  sanitizeSourceRefLabel,
} from '@/features/llm-debug/debug-redaction';
import type { ZodType } from 'zod';

const RAW_PREVIEW_LIMIT = 3200;

type InvokeStageParams<T> = {
  attemptDebugRecord?: (record: LlmDebugRecord) => void;
  inputText: string;
  jobId: string;
  onAttemptBoundary?: (input: {
    attempt: number;
    stage: string;
    status: 'started' | 'retrying';
  }) => void;
  onTextChunk?: (input: {
    accumulatedText: string;
    attempt: number;
    chunk: string;
  }) => void;
  prompt: string;
  schema: ZodType<T>;
  sourceRefLabel: string;
  sourceType?: 'url' | 'file';
  stage: string;
};

function truncatePreview(value: string | null) {
  if (value == null || value.length <= RAW_PREVIEW_LIMIT) {
    return {
      truncated: false,
      value,
    };
  }

  return {
    truncated: true,
    value: `${value.slice(0, RAW_PREVIEW_LIMIT)}\n…[truncated]`,
  };
}

function buildChatCompletionsUrl(baseUrl?: string) {
  const normalizedBaseUrl = (baseUrl ?? 'https://api.openai.com/v1').replace(
    /\/+$/,
    '',
  );

  return `${normalizedBaseUrl}/chat/completions`;
}

function extractDeltaContent(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const choices =
    'choices' in payload && Array.isArray(payload.choices) ? payload.choices : [];

  return choices
    .map((choice) => {
      if (!choice || typeof choice !== 'object' || !('delta' in choice)) {
        return '';
      }

      const delta = choice.delta;
      if (!delta || typeof delta !== 'object') {
        return '';
      }

      if ('content' in delta && typeof delta.content === 'string') {
        return delta.content;
      }

      return '';
    })
    .join('');
}

async function streamChatCompletion(input: {
  apiKey: string;
  baseUrl?: string;
  messages: Array<{ content: string; role: 'system' | 'user' }>;
  model: string;
  onTextChunk?: (chunk: string) => void;
  temperature: number;
}) {
  const response = await fetch(buildChatCompletionsUrl(input.baseUrl), {
    body: JSON.stringify({
      messages: input.messages,
      model: input.model,
      stream: true,
      stream_options: {
        include_usage: false,
      },
      temperature: input.temperature,
    }),
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok || !response.body) {
    throw new Error(`LLM stream failed with status ${response.status}.`);
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const lines = frame
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        if (!line.startsWith('data:')) {
          continue;
        }

        const payload = line.slice('data:'.length).trim();

        if (!payload || payload === '[DONE]') {
          continue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        const textChunk = extractDeltaContent(parsed);
        if (textChunk) {
          input.onTextChunk?.(textChunk);
        }
      }
    }
  }
}

function extractJsonCandidate(rawText: string) {
  const trimmed = rawText.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const firstBrace = withoutFence.indexOf('{');
  const lastBrace = withoutFence.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    return withoutFence.slice(firstBrace, lastBrace + 1);
  }

  return withoutFence;
}

function createStageDebugRecord(input: {
  attempt: number;
  durationMs: number;
  errorMessage?: string;
  errorStage?: LlmDebugErrorStage;
  parsed: unknown | null;
  rawText: string | null;
  summary: LlmDebugSummary;
}) {
  const truncatedPreview = truncatePreview(input.rawText);
  const sanitizedStructuredData = sanitizeDebugStructuredData({
    callType: input.summary.callType,
    value: input.parsed,
  });
  const sanitizedRawPreview = sanitizeDebugRawPreview({
    callType: input.summary.callType,
    parsed: input.parsed,
    rawPreview: truncatedPreview.value,
  });

  return {
    callId: randomUUID(),
    error:
      input.errorMessage && input.errorStage
        ? {
            message: input.errorMessage,
            stage: input.errorStage,
          }
        : null,
    meta: {
      attempt: input.attempt,
      durationMs: input.durationMs,
    },
    rawOutput: {
      available: Boolean(sanitizedRawPreview),
      preview: sanitizedRawPreview,
      truncated:
        sanitizedRawPreview === truncatedPreview.value
          ? truncatedPreview.truncated
          : false,
    },
    status: input.errorMessage ? 'failed' : 'success',
    structuredResult: {
      data: sanitizedStructuredData,
      status: input.parsed == null ? 'parse_failed' : 'success',
    },
    summary: input.summary,
    timestamp: new Date().toISOString(),
  } satisfies LlmDebugRecord;
}

export async function invokeGenerationStage<T>({
  attemptDebugRecord,
  inputText,
  jobId,
  onAttemptBoundary,
  onTextChunk,
  prompt,
  schema,
  sourceRefLabel,
  sourceType,
  stage,
}: InvokeStageParams<T>) {
  if (!env.LLM_API_KEY) {
    throw new Error('缺少 LLM_API_KEY，暂时无法生成文章。');
  }

  const summary = {
    callType: 'generate',
    model: env.LLM_MODEL,
    sourceRefLabel: sanitizeSourceRefLabel({
      sourceRef: sourceRefLabel || `job:${jobId}:${stage}`,
      sourceType: sourceType ?? 'url',
    }),
    sourceType,
    trigger: 'generate_page',
  } satisfies LlmDebugSummary;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const attemptNumber = attempt + 1;
    const startedAt = Date.now();
    let accumulatedText = '';

    try {
      onAttemptBoundary?.({
        attempt: attemptNumber,
        stage,
        status: attempt === 0 ? 'started' : 'retrying',
      });

      await streamChatCompletion({
        apiKey: env.LLM_API_KEY,
        baseUrl: env.LLM_BASE_URL,
        messages: [
          {
            content: prompt,
            role: 'system',
          },
          {
            content: inputText,
            role: 'user',
          },
        ],
        model: env.LLM_MODEL,
        onTextChunk: (chunkText) => {
          accumulatedText += chunkText;
          onTextChunk?.({
            accumulatedText,
            attempt: attemptNumber,
            chunk: chunkText,
          });
        },
        temperature: 0.3,
      });

      const parsed = schema.parse(
        JSON.parse(extractJsonCandidate(accumulatedText)),
      );
      const record = createStageDebugRecord({
        attempt: attemptNumber,
        durationMs: Date.now() - startedAt,
        parsed,
        rawText: accumulatedText,
        summary,
      });

      attemptDebugRecord?.(record);

      return parsed;
    } catch (error) {
      const nextError =
        error instanceof Error ? error : new Error(`Stage ${stage} failed.`);
      const record = createStageDebugRecord({
        attempt: attemptNumber,
        durationMs: Date.now() - startedAt,
        errorMessage: nextError.message,
        errorStage: accumulatedText ? 'structured_output' : 'llm_invoke',
        parsed: null,
        rawText: accumulatedText || null,
        summary,
      });

      attemptDebugRecord?.(record);

      if (attempt === 1) {
        throw nextError;
      }
    }
  }

  throw new Error(`Stage ${stage} failed.`);
}
