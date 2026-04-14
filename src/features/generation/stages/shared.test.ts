import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('@/lib/env', () => ({
  env: {
    LLM_API_KEY: 'test-key',
    LLM_BASE_URL: 'https://example.com/v1',
    LLM_MODEL: 'test-model',
  },
}));

import { invokeGenerationStage } from './shared';

function createSseResponse(frames: string[]) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const frame of frames) {
          controller.enqueue(encoder.encode(frame));
        }
        controller.close();
      },
    }),
    {
      status: 200,
    },
  );
}

describe('invokeGenerationStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('emits chunk callbacks and returns the final structured payload', async () => {
    vi.mocked(fetch).mockResolvedValue(
      createSseResponse([
        'data: {"choices":[{"delta":{"content":"{\\"value\\":\\"Hel"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"lo world\\"}"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );

    const onTextChunk = vi.fn();

    await expect(
      invokeGenerationStage({
        inputText: 'source text',
        jobId: 'job-1',
        onTextChunk,
        prompt: 'Return JSON only.',
        schema: z.object({
          value: z.string(),
        }),
        sourceRefLabel: 'job:job-1:english',
        stage: 'english',
      }),
    ).resolves.toEqual({
      value: 'Hello world',
    });

    expect(onTextChunk).toHaveBeenNthCalledWith(1, {
      accumulatedText: '{"value":"Hel',
      attempt: 1,
      chunk: '{"value":"Hel',
    });
    expect(onTextChunk).toHaveBeenNthCalledWith(2, {
      accumulatedText: '{"value":"Hello world"}',
      attempt: 1,
      chunk: 'lo world"}',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('retries with the next attempt number when parsing fails', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        createSseResponse([
          'data: {"choices":[{"delta":{"content":"not json"}}]}\n\n',
          'data: [DONE]\n\n',
        ]),
      )
      .mockResolvedValueOnce(
        createSseResponse([
          'data: {"choices":[{"delta":{"content":"{\\"value\\":\\"retry ok\\"}"}}]}\n\n',
          'data: [DONE]\n\n',
        ]),
      );

    const onTextChunk = vi.fn();
    const onAttemptBoundary = vi.fn();

    await expect(
      invokeGenerationStage({
        inputText: 'source text',
        jobId: 'job-1',
        onAttemptBoundary,
        onTextChunk,
        prompt: 'Return JSON only.',
        schema: z.object({
          value: z.string(),
        }),
        sourceRefLabel: 'job:job-1:english',
        stage: 'english',
      }),
    ).resolves.toEqual({
      value: 'retry ok',
    });

    expect(onAttemptBoundary).toHaveBeenNthCalledWith(1, {
      attempt: 1,
      stage: 'english',
      status: 'started',
    });
    expect(onAttemptBoundary).toHaveBeenNthCalledWith(2, {
      attempt: 2,
      stage: 'english',
      status: 'retrying',
    });
    expect(onTextChunk).toHaveBeenLastCalledWith({
      accumulatedText: '{"value":"retry ok"}',
      attempt: 2,
      chunk: '{"value":"retry ok"}',
    });
  });
});
