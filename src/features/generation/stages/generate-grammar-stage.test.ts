import { describe, expect, it, vi } from 'vitest';

const { invokeGenerationStageMock } = vi.hoisted(() => ({
  invokeGenerationStageMock: vi.fn(),
}));

vi.mock('./shared', () => ({
  invokeGenerationStage: invokeGenerationStageMock,
}));

import { generateGrammarStage } from './generate-grammar-stage';

describe('generateGrammarStage', () => {
  it('requires all language_evolution fields explicitly in the prompt', async () => {
    invokeGenerationStageMock.mockResolvedValue({
      language_evolution: {
        explanation: 'desc',
        imitation_example: 'example',
        rewritten_sentence: 'sentence',
        target_structure: 'structure',
      },
    });

    await generateGrammarStage({
      articleText: 'A short English article.',
      jobId: 'job-1',
      userId: 'user-1',
    });

    expect(invokeGenerationStageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        inputText: expect.stringContaining(
          'language_evolution 对象必须同时包含 target_structure、rewritten_sentence、explanation、imitation_example',
        ),
        prompt: expect.stringContaining(
          'language_evolution 里的四个字段都必须输出',
        ),
      }),
    );
  });
});
