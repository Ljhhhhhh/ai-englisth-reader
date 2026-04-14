import { HumanMessage } from '@langchain/core/messages';
import type { ChatOpenAI } from '@langchain/openai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { invokeStructuredWithDebug } from './capture';

describe('invokeStructuredWithDebug', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an llm_invoke failure record when the model call times out', async () => {
    vi.useFakeTimers();

    const invoke = vi.fn(() => new Promise(() => {}));
    const llm = {
      withStructuredOutput: vi.fn(() => ({
        invoke,
      })),
    } as unknown as ChatOpenAI;

    const resultPromise = invokeStructuredWithDebug({
      llm,
      messages: [new HumanMessage('hello')],
      schema: z.object({
        ok: z.boolean(),
      }),
      summary: {
        callType: 'generate',
        model: 'test-model',
        trigger: 'generate_page',
      },
      timeoutMs: 1_000,
    });

    await vi.advanceTimersByTimeAsync(1_000);

    const result = await resultPromise;

    expect(result.parsed).toBeNull();
    expect(result.error?.message).toBe('LLM invoke timed out after 1000ms.');
    expect(result.record.status).toBe('failed');
    expect(result.record.error).toEqual({
      message: 'LLM invoke timed out after 1000ms.',
      stage: 'llm_invoke',
    });
    expect(result.record.meta.durationMs).toBe(1_000);
  });
});
