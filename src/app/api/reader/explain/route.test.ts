import { beforeEach, describe, expect, it, vi } from 'vitest';

const articleMocks = vi.hoisted(() => ({
  loadArticleForViewer: vi.fn(),
}));

const explainMocks = vi.hoisted(() => ({
  explainReaderSelection: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const debugConfigMocks = vi.hoisted(() => ({
  isServerLlmDebugEnabled: vi.fn(),
}));

vi.mock('@/features/articles/article-service', () => articleMocks);
vi.mock('@/features/auth/current-user', () => authMocks);
vi.mock('@/features/reader/reader-explain-service', () => explainMocks);
vi.mock('@/features/llm-debug/debug-config', () => debugConfigMocks);

import { POST } from './route';

describe('POST /api/reader/explain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getCurrentUser.mockResolvedValue(null);
    debugConfigMocks.isServerLlmDebugEnabled.mockReturnValue(true);
  });

  it('rejects incomplete requests', async () => {
    const response = await POST(
      new Request('http://localhost/api/reader/explain', {
        body: JSON.stringify({ articleSlug: 'welcome-to-deep-reading' }),
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        'articleSlug, sentenceId, sentenceText, selectedText, and mode are required',
    });
  });

  it('loads the article and returns the explanation payload', async () => {
    articleMocks.loadArticleForViewer.mockResolvedValue({ slug: 'welcome-to-deep-reading' });
    explainMocks.explainReaderSelection.mockImplementation(async (_input, options) => {
      options?.onDebugRecord?.({
        callId: 'call-1',
        error: null,
        meta: { durationMs: 140 },
        rawOutput: {
          available: true,
          preview: '{"meaning":"清晰的"}',
          truncated: false,
        },
        status: 'success',
        structuredResult: {
          data: { meaning: '清晰的' },
          status: 'success',
        },
        summary: {
          callType: 'word',
          model: 'test-model',
          selectedText: 'clear',
          sentenceId: 's3',
          trigger: 'reader_panel',
        },
        timestamp: '2026-04-14T00:00:00.000Z',
      });

      return {
      mode: 'word',
      selectedText: 'clear',
      lemma: 'clear',
      meaning: '清晰的',
      contextMeaning: '这里指明确、能帮读者跟住文章的。',
      explanation: '这里不是“透明”，而是“明确、清楚”的支持。',
      memoryHook: '把 clear support 记成“清楚的支撑”。',
      sourceSentence:
        'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
      usageExample:
        'Clear instructions help new readers build confidence quickly.',
      };
    });

    const response = await POST(
      new Request('http://localhost/api/reader/explain', {
        body: JSON.stringify({
          articleSlug: 'welcome-to-deep-reading',
          sentenceId: 's3',
          sentenceText:
            'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
          selectedText: 'clear',
          mode: 'word',
        }),
        method: 'POST',
      }),
    );

    expect(response.status).toBe(200);
    expect(articleMocks.loadArticleForViewer).toHaveBeenCalledWith(
      'welcome-to-deep-reading',
      undefined,
    );
    expect(explainMocks.explainReaderSelection).toHaveBeenCalledWith(
      {
        article: { slug: 'welcome-to-deep-reading' },
        mode: 'word',
        selectedText: 'clear',
        sentenceId: 's3',
        sentenceText:
          'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
      },
      expect.objectContaining({
        onDebugRecord: expect.any(Function),
      }),
    );
    await expect(response.json()).resolves.toEqual({
      llmDebug: {
        callId: 'call-1',
        error: null,
        meta: { durationMs: 140 },
        rawOutput: {
          available: true,
          preview: '{"meaning":"清晰的"}',
          truncated: false,
        },
        status: 'success',
        structuredResult: {
          data: { meaning: '清晰的' },
          status: 'success',
        },
        summary: {
          callType: 'word',
          model: 'test-model',
          selectedText: 'clear',
          sentenceId: 's3',
          trigger: 'reader_panel',
        },
        timestamp: '2026-04-14T00:00:00.000Z',
      },
      mode: 'word',
      selectedText: 'clear',
      lemma: 'clear',
      meaning: '清晰的',
      contextMeaning: '这里指明确、能帮读者跟住文章的。',
      explanation: '这里不是“透明”，而是“明确、清楚”的支持。',
      memoryHook: '把 clear support 记成“清楚的支撑”。',
      sourceSentence:
        'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
      usageExample:
        'Clear instructions help new readers build confidence quickly.',
    });
  });

  it('returns error and llmDebug together when explain fails', async () => {
    articleMocks.loadArticleForViewer.mockResolvedValue({ slug: 'welcome-to-deep-reading' });
    explainMocks.explainReaderSelection.mockImplementation(async (_input, options) => {
      options?.onDebugRecord?.({
        callId: 'call-2',
        error: {
          message: 'LLM structured output parse failed.',
          stage: 'structured_output',
        },
        meta: { durationMs: 90 },
        rawOutput: {
          available: true,
          preview: '{"broken":true}',
          truncated: false,
        },
        status: 'failed',
        structuredResult: {
          data: null,
          status: 'parse_failed',
        },
        summary: {
          callType: 'phrase',
          model: 'test-model',
          selectedText: 'rather than',
          sentenceId: 's3',
          trigger: 'reader_panel',
        },
        timestamp: '2026-04-14T00:00:00.000Z',
      });

      throw new Error('LLM structured output parse failed.');
    });

    const response = await POST(
      new Request('http://localhost/api/reader/explain', {
        body: JSON.stringify({
          articleSlug: 'welcome-to-deep-reading',
          sentenceId: 's3',
          sentenceText:
            'Guided by clear support, the reader can follow the main idea with less panic and more focus.',
          selectedText: 'rather than',
          mode: 'phrase',
        }),
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'LLM structured output parse failed.',
      llmDebug: {
        callId: 'call-2',
        error: {
          message: 'LLM structured output parse failed.',
          stage: 'structured_output',
        },
        meta: { durationMs: 90 },
        rawOutput: {
          available: true,
          preview: '{"broken":true}',
          truncated: false,
        },
        status: 'failed',
        structuredResult: {
          data: null,
          status: 'parse_failed',
        },
        summary: {
          callType: 'phrase',
          model: 'test-model',
          selectedText: 'rather than',
          sentenceId: 's3',
          trigger: 'reader_panel',
        },
        timestamp: '2026-04-14T00:00:00.000Z',
      },
    });
  });
});
