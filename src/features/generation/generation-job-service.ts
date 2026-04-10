import { db } from '@/lib/db';

export type GenerationJobRecord = {
  articleSlug: string | null;
  createdAt: Date;
  deviceId: string;
  errorMsg: string | null;
  id: string;
  sourceRef: string;
  sourceType: string;
  status: string;
  updatedAt: Date;
};

export async function createGenerationJob(input: {
  deviceId: string;
  sourceRef: string;
  sourceType: string;
}) {
  return db.generationJob.create({
    data: {
      deviceId: input.deviceId,
      sourceRef: input.sourceRef,
      sourceType: input.sourceType,
      status: 'pending',
    },
  });
}

export async function countRecentGenerationJobs(deviceId: string, since: Date) {
  return db.generationJob.count({
    where: {
      createdAt: {
        gte: since,
      },
      deviceId,
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
