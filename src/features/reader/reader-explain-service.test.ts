import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

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

type SchemaWithSafeParse = {
  safeParse: (value: unknown) => { success: boolean };
};

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

  it('uses a word-mode schema that requires all word fields', async () => {
    const article = await loadArticle(
      'ashpreet-bedi-on-x-systems-engineering-building-agentic-software-that-works-x-5eb0cd',
    );

    await explainReaderSelection({
      article,
      mode: 'word',
      selectedText: 'layered',
      sentenceId: 's6',
      sentenceText:
        'The Dash prototype demonstrates systemic design: layered contextual data improves query accuracy, databases replace files for storage, and tool permissions are configuration-based rather than prompt-dependent.',
    });

    const firstStructuredOutputCall =
      llmMocks.withStructuredOutputMock.mock.calls[0];
    expect(firstStructuredOutputCall).toBeDefined();
    if (!firstStructuredOutputCall) {
      throw new Error('expected word structured-output schema call');
    }
    const wordSchema = (firstStructuredOutputCall as unknown as [SchemaWithSafeParse])[0];

    expect(
      wordSchema.safeParse({
        meaning: '分层的',
        contextMeaning: '这里强调数据不是平铺，而是按层次组织。',
        explanation: 'layered 在这里强调按层组织。',
      }).success,
    ).toBe(false);
    expect(
      wordSchema.safeParse({
        meaning: '分层的',
        contextMeaning: '这里强调数据不是平铺，而是按层次组织。',
        explanation: 'layered 在这里强调按层组织。',
        lemma: 'layered',
        memoryHook: 'layer 一层层堆起来',
        usageExample:
          'The system uses a layered design so each responsibility stays clear.',
      }).success,
    ).toBe(true);
  });

  it('uses a phrase-mode schema that keeps phraseType optional but requires usageExample', async () => {
    llmMocks.invokeMock.mockResolvedValueOnce({
      meaning: '而不是',
      contextMeaning: '这里表示前后两种状态的对比。',
      explanation: 'rather than 在这里整体表示取前舍后。',
      usageExample: 'She chose tea rather than coffee.',
    });

    const article = await loadArticle(
      'ashpreet-bedi-on-x-systems-engineering-building-agentic-software-that-works-x-5eb0cd',
    );

    await explainReaderSelection({
      article,
      mode: 'phrase',
      selectedText: 'rather than',
      sentenceId: 's6',
      sentenceText:
        'The Dash prototype demonstrates systemic design: layered contextual data improves query accuracy, databases replace files for storage, and tool permissions are configuration-based rather than prompt-dependent.',
    });

    const firstStructuredOutputCall =
      llmMocks.withStructuredOutputMock.mock.calls[0];
    expect(firstStructuredOutputCall).toBeDefined();
    if (!firstStructuredOutputCall) {
      throw new Error('expected phrase structured-output schema call');
    }
    const phraseSchema = (firstStructuredOutputCall as unknown as [SchemaWithSafeParse])[0];

    expect(
      phraseSchema.safeParse({
        meaning: '而不是',
        contextMeaning: '这里表示前后两种状态的对比。',
        explanation: 'rather than 在这里整体表示取前舍后。',
      }).success,
    ).toBe(false);
    expect(
      phraseSchema.safeParse({
        meaning: '而不是',
        contextMeaning: '这里表示前后两种状态的对比。',
        explanation: 'rather than 在这里整体表示取前舍后。',
        usageExample: 'She chose tea rather than coffee.',
      }).success,
    ).toBe(true);
  });

  it('uses aligned word input keys and treats site references as secondary to the sentence', async () => {
    const article = await loadArticle('welcome-to-deep-reading');

    await explainReaderSelection({
      article,
      mode: 'word',
      selectedText: 'guided',
      sentenceId: 's3',
      sentenceText:
        'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
    });

    const promptMessages = llmMocks.invokeMock.mock.calls[0]?.[0];
    const systemPrompt = promptMessages?.find(
      (message: unknown) => message instanceof SystemMessage,
    );
    const humanPrompt = promptMessages?.find(
      (message: unknown) => message instanceof HumanMessage,
    );

    expect(systemPrompt?.content).toContain(
      '如果提供 supplementalReference，它只用于辅助校准；若与 currentSentence 冲突，一律以 currentSentence 为准。',
    );
    expect(systemPrompt?.content).toContain(
      '输出语言：meaning、contextMeaning 必须以自然、简洁、对中文母语者友好的中文为主；explanation、memoryHook 默认也用中文，但在更利于理解或记忆时可以少量中英结合。不要把讲解主体写成整段英文。只有 usageExample 保持英文例句，lemma 保持英文原形。',
    );
    expect(humanPrompt?.content).toContain(
      'currentSentence: Guided by clear support, the reader can follow the main idea with less panic and more focus.',
    );
    expect(humanPrompt?.content).toContain('targetWord: guided');
    expect(humanPrompt?.content).toContain('supplementalReference:');
    expect(humanPrompt?.content).toContain('referenceMeaning: 被引导的');
    expect(humanPrompt?.content).toContain(
      'referencePolicy: 仅作参考；若与 currentSentence 冲突，以 currentSentence 为准。',
    );
    expect(humanPrompt?.content).not.toContain('模式：');
    expect(humanPrompt?.content).not.toContain('选中内容：');
  });

  it('uses aligned phrase input keys and returns phrase metadata', async () => {
    llmMocks.invokeMock.mockResolvedValueOnce({
      meaning: '依赖于',
      contextMeaning: '这里指结果取决于具体上下文。',
      explanation: '这个短语强调“由某事决定”，要按整体理解。',
      phraseType: '固定搭配',
      usageExample: 'The outcome depends on careful planning.',
    });

    const article = await loadArticle(
      'ashpreet-bedi-on-x-systems-engineering-building-agentic-software-that-works-x-5eb0cd',
    );

    await expect(
      explainReaderSelection({
        article,
        mode: 'phrase',
        selectedText: 'rather than',
        sentenceId: 's6',
        sentenceText:
          'The Dash prototype demonstrates systemic design: layered contextual data improves query accuracy, databases replace files for storage, and tool permissions are configuration-based rather than prompt-dependent.',
      }),
    ).resolves.toMatchObject({
      mode: 'phrase',
      selectedText: 'rather than',
      phraseType: '固定搭配',
      usageExample: 'The outcome depends on careful planning.',
    });

    const promptMessages = llmMocks.invokeMock.mock.calls.at(-1)?.[0];
    const systemPrompt = promptMessages?.find(
      (message: unknown) => message instanceof SystemMessage,
    );
    const humanPrompt = promptMessages?.find(
      (message: unknown) => message instanceof HumanMessage,
    );

    expect(systemPrompt?.content).toContain(
      '你是中文母语者的英文阅读讲解助手。只解释当前句子里的目标英文短语，不扩展整段，不闲聊。',
    );
    expect(systemPrompt?.content).toContain(
      '输出语言：meaning、contextMeaning、phraseType 必须以自然、简洁、对中文母语者友好的中文为主；explanation 默认也用中文，但在更利于理解或记忆时可以少量中英结合。不要把讲解主体写成整段英文。只有 usageExample 保持英文例句。',
    );
    expect(humanPrompt?.content).toContain(
      'currentSentence: The Dash prototype demonstrates systemic design: layered contextual data improves query accuracy, databases replace files for storage, and tool permissions are configuration-based rather than prompt-dependent.',
    );
    expect(humanPrompt?.content).toContain('targetPhrase: rather than');
    expect(humanPrompt?.content).not.toContain('模式：');
    expect(humanPrompt?.content).not.toContain('选中内容：');
  });
});
