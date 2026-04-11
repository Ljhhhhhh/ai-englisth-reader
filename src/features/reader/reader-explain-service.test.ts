import { beforeEach, describe, expect, it, vi } from 'vitest';

const llmMocks = vi.hoisted(() => {
  const invokeMock = vi.fn();
  const withStructuredOutputMock = vi.fn(() => ({
    invoke: invokeMock,
  }));
  function ChatOpenAIMock() {}
  ChatOpenAIMock.prototype.withStructuredOutput = withStructuredOutputMock;

  return {
    invokeMock,
    withStructuredOutputMock,
    chatOpenAIMock: ChatOpenAIMock,
  };
});

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: llmMocks.chatOpenAIMock,
}));

vi.mock('@/lib/env', () => ({
  env: {
    LLM_API_KEY: 'test-key',
    LLM_BASE_URL: 'https://example.com/v1',
    LLM_MODEL: 'test-model',
  },
}));

import { loadArticle } from '@/features/articles/article-service';
import { explainReaderSelection } from './reader-explain-service';

describe('reader-explain-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    llmMocks.invokeMock.mockResolvedValue({
      meaning: '分层的',
      contextMeaning: '这里强调数据不是平铺，而是按层次组织。',
      explanation: 'layered 在这里不是“有层”的字面意思，而是“按层组织”的系统设计说法。',
      lemma: 'layered',
      memoryHook: '把 layer 想成一层层叠起来，就能记住 layered 的“分层组织”。',
      usageExample: 'The system uses a layered design so each responsibility stays clear.',
    });
  });

  it('can explain a non-vocabulary word without throwing', async () => {
    const article = await loadArticle(
      'ashpreet-bedi-on-x-systems-engineering-building-agentic-software-that-works-x-5eb0cd',
    );

    await expect(
      explainReaderSelection({
        article,
        mode: 'word',
        selectedText: 'layered',
        sentenceId: 's6',
        sentenceText:
          'The Dash prototype demonstrates systemic design: layered contextual data improves query accuracy, databases replace files for storage, and tool permissions are configuration-based rather than prompt-dependent.',
      }),
    ).resolves.toMatchObject({
      mode: 'word',
      selectedText: 'layered',
      lemma: 'layered',
      meaning: '分层的',
      memoryHook: expect.any(String),
      usageExample: expect.any(String),
    });
  });
});
