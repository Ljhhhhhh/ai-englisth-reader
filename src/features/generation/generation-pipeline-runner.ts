import { randomUUID } from 'node:crypto';
import { isServerLlmDebugEnabled } from '@/features/llm-debug/debug-config';
import { setGenerateJobDebugRecord } from '@/features/llm-debug/debug-store';
import { upsertPersistedArticle } from '@/features/articles/article-repository';
import {
  clearLiveStageDraft,
  clearLiveStageDraftsForJob,
  setLiveStageDraft,
} from './live-stage-store';
import { parseGenerationStages, type GenerationStageName } from './generation-job-schema';
import {
  claimGenerationJob,
  getGenerationJob,
  publishGenerationJobArticle,
  setGenerationJobFailure,
  updateGenerationJobStage,
} from './generation-job-service';
import { appendGenerationLog } from './generation-logger';
import { buildFinalArticle } from './stages/build-final-article';
import { generateEnglishStage } from './stages/generate-english-stage';
import { generateGrammarStage } from './stages/generate-grammar-stage';
import { generateTranslationStage } from './stages/generate-translation-stage';
import { generateVocabularyStage } from './stages/generate-vocabulary-stage';

const CLAIM_TTL_MS = 5 * 60_000;

type StageContext = {
  english?: Awaited<ReturnType<typeof generateEnglishStage>>;
  grammar?: Awaited<ReturnType<typeof generateGrammarStage>>;
  translation?: Awaited<ReturnType<typeof generateTranslationStage>>;
  vocabulary?: Awaited<ReturnType<typeof generateVocabularyStage>>;
};

function createStageDraftWriter(jobId: string, stage: GenerationStageName) {
  clearLiveStageDraft(jobId, stage);

  let latestText = '';
  let latestAttempt = 1;

  return {
    complete() {
      if (!latestText) {
        return;
      }

      setLiveStageDraft({
        attempt: latestAttempt,
        jobId,
        stage,
        status: 'completed',
        text: latestText,
        updatedAt: new Date().toISOString(),
      });
    },
    fail() {
      clearLiveStageDraft(jobId, stage);
    },
    onTextChunk(input: {
      accumulatedText: string;
      attempt: number;
    }) {
      latestAttempt = input.attempt;
      latestText = input.accumulatedText;
      setLiveStageDraft({
        attempt: input.attempt,
        jobId,
        stage,
        status: 'streaming',
        text: input.accumulatedText,
        updatedAt: new Date().toISOString(),
      });
    },
  };
}

async function markStageRunning(input: {
  claimToken: string;
  jobId: string;
  revision: number;
  stage: GenerationStageName;
  userId: string;
}) {
  const updated = await updateGenerationJobStage({
    claimToken: input.claimToken,
    id: input.jobId,
    nextStatus: 'processing',
    revision: input.revision,
    stage: input.stage,
    stageData: {
      startedAt: new Date().toISOString(),
      status: 'running',
    },
  });

  await appendGenerationLog({
    event: 'stage_started',
    jobId: input.jobId,
    payload: {
      revision: updated?.revision ?? input.revision + 1,
    },
    stage: input.stage,
    userId: input.userId,
  });

  return updated?.revision ?? input.revision + 1;
}

async function markStageSucceeded(input: {
  claimToken: string;
  data: unknown;
  jobId: string;
  revision: number;
  stage: GenerationStageName;
  userId: string;
}) {
  const updated = await updateGenerationJobStage({
    claimToken: input.claimToken,
    id: input.jobId,
    nextStatus: 'processing',
    revision: input.revision,
    stage: input.stage,
    stageData: {
      completedAt: new Date().toISOString(),
      data: input.data,
      status: 'succeeded',
    },
  });

  await appendGenerationLog({
    event: 'stage_succeeded',
    jobId: input.jobId,
    payload: {
      data: input.data,
      revision: updated?.revision ?? input.revision + 1,
    },
    stage: input.stage,
    userId: input.userId,
  });

  return updated?.revision ?? input.revision + 1;
}

function withDebug(jobId: string, userId: string) {
  if (!isServerLlmDebugEnabled()) {
    return undefined;
  }

  return (record: Parameters<typeof setGenerateJobDebugRecord>[0]['record']) => {
    setGenerateJobDebugRecord({
      jobId,
      record,
      userId,
    });
  };
}

export async function startOrResumeGenerationJobRun(input: {
  jobId: string;
  triggeredBy: string;
}) {
  const current = await getGenerationJob(input.jobId);

  if (!current) {
    return null;
  }

  if (!current.canonicalSource || !current.canonicalText) {
    return setGenerationJobFailure({
      id: input.jobId,
      message: '任务缺少可恢复的原始输入。',
    });
  }

  const claimToken = `claim-${randomUUID()}`;
  const claimed = await claimGenerationJob({
    claimToken,
    claimedBy: input.triggeredBy,
    claimedUntil: new Date(Date.now() + CLAIM_TTL_MS),
    id: input.jobId,
    now: new Date(),
  });

  if (!claimed) {
    await appendGenerationLog({
      event: 'job_claim_skipped',
      jobId: input.jobId,
      payload: {
        triggeredBy: input.triggeredBy,
      },
      userId: current.userId,
    });
    return getGenerationJob(input.jobId);
  }

  await appendGenerationLog({
    event: 'job_claimed',
    jobId: input.jobId,
    payload: {
      activeAttempt: claimed.activeAttempt,
      revision: claimed.revision,
      triggeredBy: input.triggeredBy,
    },
    userId: current.userId,
  });

  const stageSnapshots = parseGenerationStages(current.stagesJson);
  const attemptDebugRecord = withDebug(input.jobId, current.userId);
  let revision = claimed.revision;
  let activeStage: GenerationStageName | null = null;
  const stageContext: StageContext = {
    english:
      stageSnapshots.english.status === 'succeeded'
        ? (stageSnapshots.english.data as StageContext['english'])
        : undefined,
    grammar:
      stageSnapshots.grammar.status === 'succeeded'
        ? (stageSnapshots.grammar.data as StageContext['grammar'])
        : undefined,
    translation:
      stageSnapshots.translation.status === 'succeeded'
        ? (stageSnapshots.translation.data as StageContext['translation'])
        : undefined,
    vocabulary:
      stageSnapshots.vocabulary.status === 'succeeded'
        ? (stageSnapshots.vocabulary.data as StageContext['vocabulary'])
        : undefined,
  };

  try {
    if (!stageContext.english) {
      activeStage = 'english';
      const draftWriter = createStageDraftWriter(input.jobId, 'english');
      revision = await markStageRunning({
        claimToken,
        jobId: input.jobId,
        revision,
        stage: 'english',
        userId: current.userId,
      });
      stageContext.english = await generateEnglishStage({
        attemptDebugRecord,
        jobId: input.jobId,
        onTextChunk: ({ accumulatedText, attempt }) => {
          draftWriter.onTextChunk({ accumulatedText, attempt });
        },
        sourceRefLabel: current.canonicalSource,
        sourceText: current.canonicalText,
        sourceType: current.sourceType === 'file' ? 'file' : 'url',
      });
      draftWriter.complete();
      revision = await markStageSucceeded({
        claimToken,
        data: stageContext.english,
        jobId: input.jobId,
        revision,
        stage: 'english',
        userId: current.userId,
      });
    }

    if (!stageContext.vocabulary) {
      activeStage = 'vocabulary';
      const draftWriter = createStageDraftWriter(input.jobId, 'vocabulary');
      revision = await markStageRunning({
        claimToken,
        jobId: input.jobId,
        revision,
        stage: 'vocabulary',
        userId: current.userId,
      });
      stageContext.vocabulary = await generateVocabularyStage({
        articleText: stageContext.english.feynman_summary,
        attemptDebugRecord,
        jobId: input.jobId,
        onTextChunk: ({ accumulatedText, attempt }) => {
          draftWriter.onTextChunk({ accumulatedText, attempt });
        },
        sourceType: current.sourceType === 'file' ? 'file' : 'url',
        userId: current.userId,
      });
      draftWriter.complete();
      revision = await markStageSucceeded({
        claimToken,
        data: stageContext.vocabulary,
        jobId: input.jobId,
        revision,
        stage: 'vocabulary',
        userId: current.userId,
      });
    }

    if (!stageContext.grammar) {
      activeStage = 'grammar';
      const draftWriter = createStageDraftWriter(input.jobId, 'grammar');
      revision = await markStageRunning({
        claimToken,
        jobId: input.jobId,
        revision,
        stage: 'grammar',
        userId: current.userId,
      });
      stageContext.grammar = await generateGrammarStage({
        articleText: stageContext.english.feynman_summary,
        attemptDebugRecord,
        jobId: input.jobId,
        onTextChunk: ({ accumulatedText, attempt }) => {
          draftWriter.onTextChunk({ accumulatedText, attempt });
        },
        sourceType: current.sourceType === 'file' ? 'file' : 'url',
        userId: current.userId,
      });
      draftWriter.complete();
      revision = await markStageSucceeded({
        claimToken,
        data: stageContext.grammar,
        jobId: input.jobId,
        revision,
        stage: 'grammar',
        userId: current.userId,
      });
    }

    if (!stageContext.translation) {
      activeStage = 'translation';
      const draftWriter = createStageDraftWriter(input.jobId, 'translation');
      revision = await markStageRunning({
        claimToken,
        jobId: input.jobId,
        revision,
        stage: 'translation',
        userId: current.userId,
      });
      stageContext.translation = await generateTranslationStage({
        articleText: stageContext.english.feynman_summary,
        attemptDebugRecord,
        jobId: input.jobId,
        onTextChunk: ({ accumulatedText, attempt }) => {
          draftWriter.onTextChunk({ accumulatedText, attempt });
        },
        sourceType: current.sourceType === 'file' ? 'file' : 'url',
        userId: current.userId,
      });
      draftWriter.complete();
      revision = await markStageSucceeded({
        claimToken,
        data: stageContext.translation,
        jobId: input.jobId,
        revision,
        stage: 'translation',
        userId: current.userId,
      });
    }

    revision = await markStageRunning({
      claimToken,
      jobId: input.jobId,
      revision,
      stage: 'finalize',
      userId: current.userId,
    });

    const article = await buildFinalArticle({
      canonicalSource: current.canonicalSource,
      canonicalTitleHint: current.canonicalTitleHint ?? current.sourceRef,
      english: stageContext.english,
      grammar: stageContext.grammar,
      reservedArticleSlug: current.reservedArticleSlug ?? current.articleSlug ?? current.id,
      translation: stageContext.translation,
      vocabulary: stageContext.vocabulary,
    });

    await upsertPersistedArticle(article, {
      ownerId: current.userId,
      visibility: 'PRIVATE',
    });

    revision = await markStageSucceeded({
      claimToken,
      data: {
        difficulty: article.difficulty,
        estimatedMinutes: article.estimatedMinutes,
        paragraphs: article.paragraphs,
        slug: article.slug,
        source: article.source,
        title: article.title,
      },
      jobId: input.jobId,
      revision,
      stage: 'finalize',
      userId: current.userId,
    });

    await publishGenerationJobArticle({
      articleSlug: article.slug,
      claimToken,
      id: input.jobId,
    });

    await appendGenerationLog({
      event: 'job_completed',
      jobId: input.jobId,
      payload: {
        articleSlug: article.slug,
        difficulty: article.difficulty,
        estimatedMinutes: article.estimatedMinutes,
      },
      userId: current.userId,
    });

    clearLiveStageDraftsForJob(input.jobId);

    return getGenerationJob(input.jobId);
  } catch (error) {
    if (activeStage) {
      clearLiveStageDraft(input.jobId, activeStage);
    }

    const stage =
      stageContext.translation == null
        ? stageContext.grammar == null
          ? stageContext.vocabulary == null
            ? stageContext.english == null
              ? 'english'
              : 'vocabulary'
            : 'grammar'
          : 'translation'
        : 'finalize';

    await setGenerationJobFailure({
      claimToken,
      id: input.jobId,
      message: error instanceof Error ? error.message : '文章生成失败，请稍后重试。',
      stage,
    });

    await appendGenerationLog({
      event: 'stage_failed',
      jobId: input.jobId,
      payload: {
        message: error instanceof Error ? error.message : '文章生成失败，请稍后重试。',
      },
      stage,
      userId: current.userId,
    });

    return getGenerationJob(input.jobId);
  }
}
