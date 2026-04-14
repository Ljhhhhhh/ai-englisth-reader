import { randomUUID } from 'node:crypto';
import type { BaseMessage } from '@langchain/core/messages';
import type { ChatOpenAI } from '@langchain/openai';
import type { ZodType } from 'zod';
import type {
  LlmDebugErrorStage,
  LlmDebugRecord,
  LlmDebugStructuredStatus,
  LlmDebugSummary,
} from './debug-types';
import {
  sanitizeDebugRawPreview,
  sanitizeDebugStructuredData,
} from './debug-redaction';

const RAW_PREVIEW_LIMIT = 3200;

type NormalizedStructuredOutput<T> = {
  parsed: T | null;
  rawMessage: unknown;
  rawPreview: string | null;
  structuredStatus: LlmDebugStructuredStatus;
  truncated: boolean;
};

type InvokeStructuredWithDebugParams<T> = {
  attempt?: number;
  llm: ChatOpenAI;
  messages: BaseMessage[];
  schema: ZodType<T>;
  summary: LlmDebugSummary;
  timeoutMs?: number;
};

export type StructuredDebugInvokeResult<T> = {
  error: Error | null;
  parsed: T | null;
  record: LlmDebugRecord;
};

const DEFAULT_LLM_INVOKE_TIMEOUT_MS = 45_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`LLM invoke timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function truncatePreview(value: string) {
  if (value.length <= RAW_PREVIEW_LIMIT) {
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

function stringifyValue(value: unknown) {
  try {
    const serialized = JSON.stringify(value, null, 2);
    return serialized === undefined ? String(value) : serialized;
  } catch {
    return String(value);
  }
}

function extractMessageContent(rawMessage: {
  additional_kwargs?: unknown;
  content?: unknown;
  response_metadata?: unknown;
  tool_calls?: unknown;
}) {
  if (typeof rawMessage.content === 'string' && rawMessage.content.trim()) {
    return rawMessage.content;
  }

  if (Array.isArray(rawMessage.content) && rawMessage.content.length > 0) {
    return rawMessage.content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (
          item &&
          typeof item === 'object' &&
          'text' in item &&
          typeof item.text === 'string'
        ) {
          return item.text;
        }

        return stringifyValue(item);
      })
      .join('\n');
  }

  return stringifyValue({
    additional_kwargs: rawMessage.additional_kwargs,
    content: rawMessage.content,
    response_metadata: rawMessage.response_metadata,
    tool_calls: rawMessage.tool_calls,
  });
}

export function normalizeStructuredOutputResult<T>(
  output: unknown,
): NormalizedStructuredOutput<T> {
  if (
    output &&
    typeof output === 'object' &&
    ('raw' in output || 'parsed' in output)
  ) {
    const rawMessage = 'raw' in output ? output.raw : null;
    const parsed = ('parsed' in output ? output.parsed : null) as T | null;
    const rawPreviewSource =
      rawMessage && typeof rawMessage === 'object'
        ? extractMessageContent(rawMessage as Record<string, unknown>)
        : rawMessage == null
        ? null
        : stringifyValue(rawMessage);
    const preview = rawPreviewSource ? truncatePreview(rawPreviewSource) : null;

    return {
      parsed,
      rawMessage,
      rawPreview: preview?.value ?? null,
      structuredStatus:
        parsed !== null ? 'success' : rawMessage !== null ? 'parse_failed' : 'missing',
      truncated: preview?.truncated ?? false,
    };
  }

  return {
    parsed: output as T,
    rawMessage: null,
    rawPreview: null,
    structuredStatus: output == null ? 'missing' : 'success',
    truncated: false,
  };
}

function createDebugRecord(input: {
  attempt?: number;
  durationMs: number;
  errorMessage?: string;
  errorStage?: LlmDebugErrorStage;
  normalized: NormalizedStructuredOutput<unknown>;
  summary: LlmDebugSummary;
}) {
  const sanitizedStructuredData = sanitizeDebugStructuredData({
    callType: input.summary.callType,
    value: input.normalized.parsed,
  });
  const sanitizedRawPreview = sanitizeDebugRawPreview({
    callType: input.summary.callType,
    parsed: input.normalized.parsed,
    rawPreview: input.normalized.rawPreview,
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
        sanitizedRawPreview === input.normalized.rawPreview
          ? input.normalized.truncated
          : false,
    },
    status:
      input.errorMessage || input.normalized.structuredStatus !== 'success'
        ? 'failed'
        : 'success',
    structuredResult: {
      data: sanitizedStructuredData,
      status: input.normalized.structuredStatus,
    },
    summary: input.summary,
    timestamp: new Date().toISOString(),
  } satisfies LlmDebugRecord;
}

export function createPostProcessFailureRecord(input: {
  attempt?: number;
  baseRecord: LlmDebugRecord;
  message: string;
}) {
  return {
    ...input.baseRecord,
    callId: randomUUID(),
    error: {
      message: input.message,
      stage: 'post_process',
    },
    meta: {
      ...input.baseRecord.meta,
      attempt: input.attempt ?? input.baseRecord.meta.attempt,
    },
    status: 'failed',
    timestamp: new Date().toISOString(),
  } satisfies LlmDebugRecord;
}

export async function invokeStructuredWithDebug<T>({
  attempt,
  llm,
  messages,
  schema,
  summary,
  timeoutMs = DEFAULT_LLM_INVOKE_TIMEOUT_MS,
}: InvokeStructuredWithDebugParams<T>): Promise<StructuredDebugInvokeResult<T>> {
  const startedAt = Date.now();

  try {
    const output = await withTimeout(
      llm
        .withStructuredOutput(schema, { includeRaw: true })
        .invoke(messages),
      timeoutMs,
    );
    const normalized = normalizeStructuredOutputResult<T>(output);

    if (normalized.structuredStatus !== 'success' || normalized.parsed === null) {
      return {
        error: new Error('LLM structured output parse failed.'),
        parsed: null,
        record: createDebugRecord({
          attempt,
          durationMs: Date.now() - startedAt,
          errorMessage: 'LLM structured output parse failed.',
          errorStage: 'structured_output',
          normalized,
          summary,
        }),
      };
    }

    return {
      error: null,
      parsed: normalized.parsed,
      record: createDebugRecord({
        attempt,
        durationMs: Date.now() - startedAt,
        normalized,
        summary,
      }),
    };
  } catch (error) {
    const normalized = normalizeStructuredOutputResult<T>(null);
    const nextError =
      error instanceof Error ? error : new Error('LLM invoke failed.');

    return {
      error: nextError,
      parsed: null,
      record: createDebugRecord({
        attempt,
        durationMs: Date.now() - startedAt,
        errorMessage: nextError.message,
        errorStage: 'llm_invoke',
        normalized,
        summary,
      }),
    };
  }
}
