import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  claimGenerationJob: vi.fn(),
  getGenerationJob: vi.fn(),
  publishGenerationJobArticle: vi.fn(),
  setGenerationJobFailure: vi.fn(),
  updateGenerationJobStage: vi.fn(),
}));

const englishStageMocks = vi.hoisted(() => ({
  generateEnglishStage: vi.fn(),
}));

const vocabularyStageMocks = vi.hoisted(() => ({
  generateVocabularyStage: vi.fn(),
}));

const grammarStageMocks = vi.hoisted(() => ({
  generateGrammarStage: vi.fn(),
}));

const translationStageMocks = vi.hoisted(() => ({
  generateTranslationStage: vi.fn(),
}));

const finalizeMocks = vi.hoisted(() => ({
  buildFinalArticle: vi.fn(),
}));

const articleRepositoryMocks = vi.hoisted(() => ({
  upsertPersistedArticle: vi.fn(),
}));

const liveDraftStoreMocks = vi.hoisted(() => ({
  clearLiveStageDraft: vi.fn(),
  clearLiveStageDraftsForJob: vi.fn(),
  setLiveStageDraft: vi.fn(),
}));

const generationLoggerMocks = vi.hoisted(() => ({
  appendGenerationLog: vi.fn(),
}));

vi.mock('./generation-job-service', () => serviceMocks);
vi.mock('./stages/generate-english-stage', () => englishStageMocks);
vi.mock('./stages/generate-vocabulary-stage', () => vocabularyStageMocks);
vi.mock('./stages/generate-grammar-stage', () => grammarStageMocks);
vi.mock('./stages/generate-translation-stage', () => translationStageMocks);
vi.mock('./stages/build-final-article', () => finalizeMocks);
vi.mock('@/features/articles/article-repository', () => articleRepositoryMocks);
vi.mock('./live-stage-store', () => liveDraftStoreMocks);
vi.mock('./generation-logger', () => generationLoggerMocks);

import { startOrResumeGenerationJobRun } from './generation-pipeline-runner';

describe('generation-pipeline-runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    generationLoggerMocks.appendGenerationLog.mockResolvedValue(undefined);
  });

  it('claims long enough for a multi-stage run before starting work', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T00:00:00.000Z'));

    serviceMocks.getGenerationJob.mockResolvedValue({
      canonicalSource: 'https://example.com/article',
      canonicalText: 'raw input',
      canonicalTitleHint: 'Article Title',
      currentStep: null,
      id: 'job-1',
      reservedArticleSlug: 'article-title-job-1',
      revision: 0,
      sourceRef: 'https://example.com/article',
      sourceType: 'url',
      stagesJson: {
        english: { status: 'pending' },
        finalize: { status: 'pending' },
        grammar: { status: 'pending' },
        translation: { status: 'pending' },
        vocabulary: { status: 'pending' },
      },
      status: 'pending',
      userId: 'user-1',
    });
    serviceMocks.claimGenerationJob.mockResolvedValue(null);

    await startOrResumeGenerationJobRun({
      jobId: 'job-1',
      triggeredBy: 'create:user-1',
    });

    expect(serviceMocks.claimGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({
        claimedUntil: new Date('2026-04-14T00:05:00.000Z'),
        id: 'job-1',
        now: new Date('2026-04-14T00:00:00.000Z'),
      }),
    );
    expect(generationLoggerMocks.appendGenerationLog).toHaveBeenCalledWith({
      event: 'job_claim_skipped',
      jobId: 'job-1',
      payload: {
        triggeredBy: 'create:user-1',
      },
      userId: 'user-1',
    });
  });

  it('runs the four stages in order and finalizes on the reserved slug', async () => {
    serviceMocks.getGenerationJob.mockResolvedValueOnce({
      canonicalSource: 'https://example.com/article',
      canonicalText: 'raw input',
      canonicalTitleHint: 'Article Title',
      currentStep: null,
      id: 'job-1',
      reservedArticleSlug: 'article-title-job-1',
      revision: 0,
      sourceRef: 'https://example.com/article',
      sourceType: 'url',
      stagesJson: {
        english: { status: 'pending' },
        finalize: { status: 'pending' },
        grammar: { status: 'pending' },
        translation: { status: 'pending' },
        vocabulary: { status: 'pending' },
      },
      status: 'pending',
      userId: 'user-1',
    });
    serviceMocks.claimGenerationJob.mockResolvedValue({
      id: 'job-1',
      revision: 0,
    });
    serviceMocks.updateGenerationJobStage
      .mockResolvedValueOnce({ id: 'job-1', revision: 1 })
      .mockResolvedValueOnce({ id: 'job-1', revision: 2 })
      .mockResolvedValueOnce({ id: 'job-1', revision: 3 })
      .mockResolvedValueOnce({ id: 'job-1', revision: 4 })
      .mockResolvedValueOnce({ id: 'job-1', revision: 5 });
    articleRepositoryMocks.upsertPersistedArticle.mockResolvedValue({
      slug: 'article-title-job-1',
    });
    serviceMocks.publishGenerationJobArticle.mockResolvedValue({ id: 'job-1' });
    serviceMocks.getGenerationJob.mockResolvedValueOnce({ id: 'job-1', status: 'done' });

    englishStageMocks.generateEnglishStage.mockResolvedValue({
      feynman_summary: 'First paragraph.\n\nSecond paragraph.',
    });
    englishStageMocks.generateEnglishStage.mockImplementationOnce(
      async (input: {
        onTextChunk?: (payload: {
          accumulatedText: string;
          attempt: number;
          chunk: string;
        }) => void;
      }) => {
        input.onTextChunk?.({
          accumulatedText: '{"feynman_summary":"First',
          attempt: 1,
          chunk: '{"feynman_summary":"First',
        });
        input.onTextChunk?.({
          accumulatedText: '{"feynman_summary":"First paragraph.\\n\\nSecond paragraph."}',
          attempt: 1,
          chunk: ' paragraph.\\n\\nSecond paragraph."}',
        });

        return {
          feynman_summary: 'First paragraph.\n\nSecond paragraph.',
        };
      },
    );
    vocabularyStageMocks.generateVocabularyStage.mockResolvedValue({
      growth_vocabulary: [
        {
          chinese_meaning: '协调',
          context_meaning: '让各部分一起工作',
          memory_hook: 'coordinate a system',
          memory_type: '场景助记',
          word: 'coordinate',
        },
      ],
      high_frequency_phrases: [
        {
          chinese_meaning: '一起工作',
          phrase: 'work together',
          usage_note: 'common collaboration phrase',
        },
      ],
    });
    grammarStageMocks.generateGrammarStage.mockResolvedValue({
      language_evolution: {
        explanation: '分词结构作状语',
        imitation_example: 'Knowing the risk, she moved carefully.',
        rewritten_sentence: 'Knowing the risk, teams move carefully.',
        target_structure: '现在分词作状语',
      },
    });
    translationStageMocks.generateTranslationStage.mockResolvedValue({
      chinese_title: '系统一起运作',
      chinese_translation: '第一段。\n\n第二段。',
      list_summary_zh: '讲系统如何协同工作。',
      paragraph_translations: ['第一段。', '第二段。'],
    });
    finalizeMocks.buildFinalArticle.mockResolvedValue({
      chinese_title: '系统一起运作',
      chinese_translation: '第一段。\n\n第二段。',
      difficulty: 'B1',
      estimatedMinutes: 4,
      feynman_summary: 'First paragraph.\n\nSecond paragraph.',
      growth_vocabulary: [],
      high_frequency_phrases: [],
      language_evolution: {
        explanation: '分词结构作状语',
        imitation_example: 'Knowing the risk, she moved carefully.',
        rewritten_sentence: 'Knowing the risk, teams move carefully.',
        target_structure: '现在分词作状语',
      },
      list_summary_zh: '讲系统如何协同工作。',
      paragraphs: [],
      slug: 'article-title-job-1',
      source: 'https://example.com/article',
      title: 'Article Title',
    });

    await startOrResumeGenerationJobRun({
      jobId: 'job-1',
      triggeredBy: 'create:user-1',
    });

    expect(englishStageMocks.generateEnglishStage).toHaveBeenCalled();
    expect(liveDraftStoreMocks.clearLiveStageDraft).toHaveBeenCalledWith(
      'job-1',
      'english',
    );
    expect(liveDraftStoreMocks.setLiveStageDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: 1,
        jobId: 'job-1',
        stage: 'english',
        status: 'streaming',
        text: '{"feynman_summary":"First',
      }),
    );
    expect(liveDraftStoreMocks.setLiveStageDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: 1,
        jobId: 'job-1',
        stage: 'english',
        status: 'completed',
        text: '{"feynman_summary":"First paragraph.\\n\\nSecond paragraph."}',
      }),
    );
    expect(vocabularyStageMocks.generateVocabularyStage).toHaveBeenCalledWith(
      expect.objectContaining({
        articleText: 'First paragraph.\n\nSecond paragraph.',
        jobId: 'job-1',
        sourceType: 'url',
        userId: 'user-1',
      }),
    );
    expect(grammarStageMocks.generateGrammarStage).toHaveBeenCalledWith(
      expect.objectContaining({
        articleText: 'First paragraph.\n\nSecond paragraph.',
        jobId: 'job-1',
        sourceType: 'url',
        userId: 'user-1',
      }),
    );
    expect(translationStageMocks.generateTranslationStage).toHaveBeenCalledWith(
      expect.objectContaining({
        articleText: 'First paragraph.\n\nSecond paragraph.',
        jobId: 'job-1',
        sourceType: 'url',
        userId: 'user-1',
      }),
    );
    expect(finalizeMocks.buildFinalArticle).toHaveBeenCalledWith({
      canonicalSource: 'https://example.com/article',
      canonicalTitleHint: 'Article Title',
      english: {
        feynman_summary: 'First paragraph.\n\nSecond paragraph.',
      },
      grammar: {
        language_evolution: {
          explanation: '分词结构作状语',
          imitation_example: 'Knowing the risk, she moved carefully.',
          rewritten_sentence: 'Knowing the risk, teams move carefully.',
          target_structure: '现在分词作状语',
        },
      },
      reservedArticleSlug: 'article-title-job-1',
      translation: {
        chinese_title: '系统一起运作',
        chinese_translation: '第一段。\n\n第二段。',
        list_summary_zh: '讲系统如何协同工作。',
        paragraph_translations: ['第一段。', '第二段。'],
      },
      vocabulary: {
        growth_vocabulary: [
          {
            chinese_meaning: '协调',
            context_meaning: '让各部分一起工作',
            memory_hook: 'coordinate a system',
            memory_type: '场景助记',
            word: 'coordinate',
          },
        ],
        high_frequency_phrases: [
          {
            chinese_meaning: '一起工作',
            phrase: 'work together',
            usage_note: 'common collaboration phrase',
          },
        ],
      },
    });
    expect(articleRepositoryMocks.upsertPersistedArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'article-title-job-1',
      }),
      {
        ownerId: 'user-1',
        visibility: 'PRIVATE',
      },
    );
    expect(serviceMocks.publishGenerationJobArticle).toHaveBeenCalledWith({
      articleSlug: 'article-title-job-1',
      claimToken: expect.any(String),
      id: 'job-1',
    });
    expect(generationLoggerMocks.appendGenerationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'job_claimed',
        jobId: 'job-1',
        userId: 'user-1',
      }),
    );
    expect(generationLoggerMocks.appendGenerationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'stage_started',
        jobId: 'job-1',
        stage: 'grammar',
        userId: 'user-1',
      }),
    );
    expect(generationLoggerMocks.appendGenerationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'stage_succeeded',
        jobId: 'job-1',
        stage: 'translation',
        userId: 'user-1',
      }),
    );
    expect(generationLoggerMocks.appendGenerationLog).toHaveBeenCalledWith({
      event: 'job_completed',
      jobId: 'job-1',
      payload: {
        articleSlug: 'article-title-job-1',
        difficulty: 'B1',
        estimatedMinutes: 4,
      },
      userId: 'user-1',
    });
  });
});
