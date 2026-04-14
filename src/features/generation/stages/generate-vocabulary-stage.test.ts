import { describe, expect, it, vi } from 'vitest';

const { invokeGenerationStageMock } = vi.hoisted(() => ({
  invokeGenerationStageMock: vi.fn(),
}));

vi.mock('./shared', () => ({
  invokeGenerationStage: invokeGenerationStageMock,
}));

import { generateVocabularyStage } from './generate-vocabulary-stage';

describe('generateVocabularyStage', () => {
  it('describes object-array output requirements explicitly in the prompt', async () => {
    invokeGenerationStageMock.mockResolvedValue({
      growth_vocabulary: [],
      high_frequency_phrases: [],
    });

    await generateVocabularyStage({
      articleText: 'A short English article.',
      jobId: 'job-1',
      userId: 'user-1',
    });

    expect(invokeGenerationStageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        inputText: expect.stringContaining(
          '每个对象都必须包含 word、chinese_meaning、context_meaning、memory_type、memory_hook',
        ),
        prompt: expect.stringContaining(
          'growth_vocabulary 必须是对象数组，不允许输出字符串数组',
        ),
      }),
    );
  });
});
