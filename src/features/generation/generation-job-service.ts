import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type GenerationJobRecord = {
  articleSlug: string | null;
  createdAt: string;
  deviceId: string;
  errorMsg: string | null;
  id: string;
  sourceRef: string;
  sourceType: string;
  status: string;
  updatedAt: string;
};

const jobsDir = path.join(process.cwd(), '.runtime', 'generation-jobs');

function getJobPath(id: string) {
  return path.join(jobsDir, `${id}.json`);
}

async function ensureJobsDir() {
  await mkdir(jobsDir, { recursive: true });
}

async function writeJob(job: GenerationJobRecord) {
  await ensureJobsDir();
  await writeFile(
    getJobPath(job.id),
    `${JSON.stringify(job, null, 2)}\n`,
    'utf8',
  );
}

async function readJob(id: string) {
  try {
    const raw = await readFile(getJobPath(id), 'utf8');
    return JSON.parse(raw) as GenerationJobRecord;
  } catch {
    return null;
  }
}

export async function createGenerationJob(input: {
  deviceId: string;
  sourceRef: string;
  sourceType: string;
}) {
  const now = new Date().toISOString();
  const job: GenerationJobRecord = {
    articleSlug: null,
    createdAt: now,
    deviceId: input.deviceId,
    errorMsg: null,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    sourceRef: input.sourceRef,
    sourceType: input.sourceType,
    status: 'pending',
    updatedAt: now,
  };

  await writeJob(job);
  return job;
}

export async function countRecentGenerationJobs(deviceId: string, since: Date) {
  await ensureJobsDir();
  const files = await readdir(jobsDir);
  const jobs = await Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .map(async (file) => {
        const raw = await readFile(path.join(jobsDir, file), 'utf8');
        return JSON.parse(raw) as GenerationJobRecord;
      }),
  );

  return jobs.filter(
    (job) => job.deviceId === deviceId && new Date(job.createdAt) >= since,
  ).length;
}

export async function getGenerationJob(id: string) {
  return readJob(id);
}

export async function markGenerationJobProcessing(id: string) {
  const currentJob = await readJob(id);

  if (!currentJob) {
    return null;
  }

  const nextJob = {
    ...currentJob,
    errorMsg: null,
    status: 'processing',
    updatedAt: new Date().toISOString(),
  };

  await writeJob(nextJob);
  return nextJob;
}

export async function markGenerationJobDone(id: string, articleSlug: string) {
  const currentJob = await readJob(id);

  if (!currentJob) {
    return null;
  }

  const nextJob = {
    ...currentJob,
    articleSlug,
    errorMsg: null,
    status: 'done',
    updatedAt: new Date().toISOString(),
  };

  await writeJob(nextJob);
  return nextJob;
}

export async function markGenerationJobFailed(id: string, errorMsg: string) {
  const currentJob = await readJob(id);

  if (!currentJob) {
    return null;
  }

  const nextJob = {
    ...currentJob,
    errorMsg,
    status: 'failed',
    updatedAt: new Date().toISOString(),
  };

  await writeJob(nextJob);
  return nextJob;
}
