import { db } from '@/lib/db';

export type GenerationJobRecord = {
  articleSlug: string | null;
  createdAt: Date;
  errorMsg: string | null;
  id: string;
  sourceRef: string;
  sourceType: string;
  status: string;
  updatedAt: Date;
  userId: string;
};

export async function createGenerationJob(input: {
  sourceRef: string;
  sourceType: string;
  userId: string;
}) {
  const userId = input.userId;

  if (!userId) {
    throw new Error('userId is required');
  }

  return db.generationJob.create({
    data: {
      sourceRef: input.sourceRef,
      sourceType: input.sourceType,
      status: 'pending',
      userId,
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
  return db.generationJob.findUnique({
    where: {
      id,
    },
  });
}

export async function markGenerationJobProcessing(id: string) {
  const currentJob = await getGenerationJob(id);

  if (!currentJob) {
    return null;
  }

  return db.generationJob.update({
    data: {
      errorMsg: null,
      status: 'processing',
    },
    where: {
      id,
    },
  });
}

export async function markGenerationJobDone(id: string, articleSlug: string) {
  const currentJob = await getGenerationJob(id);

  if (!currentJob) {
    return null;
  }

  return db.generationJob.update({
    data: {
      articleSlug,
      errorMsg: null,
      status: 'done',
    },
    where: {
      id,
    },
  });
}

export async function markGenerationJobFailed(id: string, errorMsg: string) {
  const currentJob = await getGenerationJob(id);

  if (!currentJob) {
    return null;
  }

  return db.generationJob.update({
    data: {
      errorMsg,
      status: 'failed',
    },
    where: {
      id,
    },
  });
}
