import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import {
  createEmptyGenerationStages,
  parseGenerationJobLastError,
  parseGenerationStages,
  type GenerationStageName,
  type GenerationStageRecord,
} from './generation-job-schema';

export type GenerationJobRecord = {
  activeAttempt: number;
  articleSlug: string | null;
  canonicalSource: string | null;
  canonicalText: string | null;
  canonicalTitleHint: string | null;
  claimToken: string | null;
  claimedBy: string | null;
  claimedUntil: Date | null;
  createdAt: Date;
  currentStep: GenerationStageName | null;
  id: string;
  lastErrorJson: unknown;
  reservedArticleSlug: string | null;
  retryable: boolean;
  revision: number;
  sourceRef: string;
  sourceType: string;
  stagesJson: unknown;
  status: string;
  updatedAt: Date;
  userId: string;
};

export type GenerationJobSnapshot = {
  articleSlug: string | null;
  claimToken: string | null;
  claimedUntil: Date | null;
  createdAt: Date;
  currentStep: GenerationStageName | null;
  id: string;
  lastError: ReturnType<typeof parseGenerationJobLastError>;
  reservedArticleSlug: string | null;
  retryable: boolean;
  revision: number;
  sourceRef: string;
  sourceType: string;
  stages: ReturnType<typeof parseGenerationStages>;
  status: string;
  updatedAt: Date;
  userId: string;
};

const ERROR_MSG_MAX_LENGTH = 191;

function summarizeErrorMessage(message: string) {
  const normalized = message.replace(/\s+/g, ' ').trim();

  if (normalized.length <= ERROR_MSG_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, ERROR_MSG_MAX_LENGTH - 1)}…`;
}

function toSnapshot(record: GenerationJobRecord): GenerationJobSnapshot {
  return {
    articleSlug: record.articleSlug,
    claimToken: record.claimToken,
    claimedUntil: record.claimedUntil,
    createdAt: record.createdAt,
    currentStep: record.currentStep,
    id: record.id,
    lastError: parseGenerationJobLastError(record.lastErrorJson),
    reservedArticleSlug: record.reservedArticleSlug,
    retryable: record.retryable,
    revision: record.revision,
    sourceRef: record.sourceRef,
    sourceType: record.sourceType,
    stages: parseGenerationStages(record.stagesJson),
    status: record.status,
    updatedAt: record.updatedAt,
    userId: record.userId,
  };
}

export async function createGenerationJob(input: {
  canonicalSource: string;
  canonicalText: string;
  canonicalTitleHint: string;
  id: string;
  reservedArticleSlug: string;
  sourceRef: string;
  sourceType: string;
  userId: string;
}) {
  if (!input.userId) {
    throw new Error('userId is required');
  }

  return db.generationJob.create({
    data: {
      activeAttempt: 0,
      articleSlug: null,
      canonicalSource: input.canonicalSource,
      canonicalText: input.canonicalText,
      canonicalTitleHint: input.canonicalTitleHint,
      claimToken: null,
      claimedBy: null,
      claimedUntil: null,
      currentStep: null,
      id: input.id,
      lastErrorJson: Prisma.JsonNull,
      reservedArticleSlug: input.reservedArticleSlug,
      retryable: false,
      revision: 0,
      sourceRef: input.sourceRef,
      sourceType: input.sourceType,
      stagesJson: createEmptyGenerationStages() as Prisma.InputJsonValue,
      status: 'pending',
      userId: input.userId,
    },
  });
}

export async function countRecentGenerationJobs(userId: string, since: Date) {
  return db.generationJob.count({
    where: {
      createdAt: {
        gte: since,
      },
      userId,
    },
  });
}

export async function getGenerationJob(id: string) {
  return (await db.generationJob.findUnique({
    where: { id },
  })) as GenerationJobRecord | null;
}

export async function getGenerationJobForUser(id: string, userId: string) {
  const record = (await db.generationJob.findFirst({
    where: {
      id,
      userId,
    },
  })) as GenerationJobRecord | null;

  return record ? toSnapshot(record) : null;
}

export async function claimGenerationJob(input: {
  claimToken: string;
  claimedBy: string;
  claimedUntil: Date;
  id: string;
  now: Date;
}) {
  const result = await db.generationJob.updateMany({
    data: {
      activeAttempt: {
        increment: 1,
      },
      claimToken: input.claimToken,
      claimedBy: input.claimedBy,
      claimedUntil: input.claimedUntil,
    },
    where: {
      id: input.id,
      OR: [{ claimToken: null }, { claimedUntil: { lt: input.now } }],
    },
  });

  if (!result.count) {
    return null;
  }

  return getGenerationJob(input.id);
}

export async function updateGenerationJobStage(input: {
  claimToken: string;
  id: string;
  nextStatus: string;
  revision: number;
  stage: GenerationStageName;
  stageData: GenerationStageRecord;
}) {
  const current = await getGenerationJob(input.id);

  if (!current) {
    return null;
  }

  const stages = parseGenerationStages(current.stagesJson);
  stages[input.stage] = input.stageData;

  const result = await db.generationJob.updateMany({
    data: {
      currentStep: input.stage,
      revision: {
        increment: 1,
      },
      stagesJson: stages as Prisma.InputJsonValue,
      status: input.nextStatus,
    },
    where: {
      claimToken: input.claimToken,
      id: input.id,
      revision: input.revision,
    },
  });

  if (!result.count) {
    return null;
  }

  return getGenerationJob(input.id);
}

export async function setGenerationJobFailure(input: {
  claimToken?: string | null;
  id: string;
  message: string;
  stage?: GenerationStageName;
}) {
  const current = await getGenerationJob(input.id);

  if (!current) {
    return null;
  }

  const stages = parseGenerationStages(current.stagesJson);

  if (input.stage) {
    stages[input.stage] = {
      ...stages[input.stage],
      completedAt: new Date().toISOString(),
      error: { message: input.message },
      status: 'failed',
    };
  }

  return db.generationJob.update({
    data: {
      claimToken: null,
      claimedBy: null,
      claimedUntil: null,
      currentStep: input.stage ?? current.currentStep,
      errorMsg: summarizeErrorMessage(input.message),
      lastErrorJson: {
        message: input.message,
        stage: input.stage,
      } satisfies Prisma.InputJsonValue,
      retryable: true,
      stagesJson: stages as Prisma.InputJsonValue,
      status: 'failed',
    },
    where: {
      id: input.id,
    },
  });
}

export async function publishGenerationJobArticle(input: {
  articleSlug: string;
  claimToken?: string | null;
  id: string;
}) {
  return db.generationJob.update({
    data: {
      articleSlug: input.articleSlug,
      claimToken: null,
      claimedBy: null,
      claimedUntil: null,
      currentStep: 'finalize',
      errorMsg: null,
      lastErrorJson: Prisma.JsonNull,
      retryable: false,
      status: 'done',
    },
    where: {
      id: input.id,
    },
  });
}

export async function startOrResumeGenerationJob(input: {
  jobId: string;
  triggeredBy: string;
}) {
  const { startOrResumeGenerationJobRun } = await import('./generation-pipeline-runner');
  return startOrResumeGenerationJobRun(input);
}
