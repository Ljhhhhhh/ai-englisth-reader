import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    LLM_API_KEY: 'test-key',
    LLM_BASE_URL: 'https://example.com/v1',
    LLM_MODEL: 'test-model',
  },
}));

import { generateTranslationStage } from './generate-translation-stage';

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

describe('generateTranslationStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('truncates list_summary_zh to 100 characters instead of failing the stage', async () => {
    const longSummary = '长'.repeat(120);
    const payload = JSON.stringify({
      chinese_title: '中文标题',
      list_summary_zh: longSummary,
      chinese_translation: '这是全文翻译。',
      paragraph_translations: ['这是第一段译文。'],
    });

    vi.mocked(fetch).mockResolvedValue(
      createSseResponse([
        `data: ${JSON.stringify({ choices: [{ delta: { content: payload } }] })}\n\n`,
        'data: [DONE]\n\n',
      ]),
    );

    const result = await generateTranslationStage({
      articleText: 'A short English article.',
      jobId: 'job-1',
      userId: 'user-1',
    });

    expect(Array.from(result.list_summary_zh)).toHaveLength(100);
    expect(result.list_summary_zh).toBe('长'.repeat(100));
  });
});
