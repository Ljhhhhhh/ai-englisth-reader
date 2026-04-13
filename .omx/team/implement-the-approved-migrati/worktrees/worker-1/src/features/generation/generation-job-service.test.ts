import { beforeEach, describe, expect, it, vi } from 'vitest';

const generationJobMocks = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    generationJob: generationJobMocks,
  },
}));

import {
  countRecentGenerationJobs,
  createGenerationJob,
  getGenerationJob,
  getGenerationJobForUser,
  markGenerationJobDone,
  markGenerationJobFailed,
  markGenerationJobProcessing,
} from './generation-job-service';

describe('generation-job-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a pending generation job', async () => {
    generationJobMocks.create.mockResolvedValue({ id: 'job-1' });

    const job = await createGenerationJob({
      userId: 'user-1',
      sourceRef: 'https://example.com/article',
      sourceType: 'url',
      userId: 'user-1',
    });

    expect(generationJobMocks.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        sourceRef: 'https://example.com/article',
        sourceType: 'url',
        status: 'pending',
        userId: 'user-1',
      },
    });
    expect(job).toEqual({ id: 'job-1' });
  });

  it('counts recent jobs for the same user', async () => {
    generationJobMocks.count.mockResolvedValue(3);
    const since = new Date('2026-04-08T00:00:00.000Z');

    const count = await countRecentGenerationJobs('user-1', since);

    expect(generationJobMocks.count).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: since,
        },
        userId: 'user-1',
      },
    });
    expect(count).toBe(3);
  });

  it('loads a generation job by id', async () => {
    generationJobMocks.findUnique.mockResolvedValue({ id: 'job-1' });

    await expect(getGenerationJob('job-1')).resolves.toEqual({ id: 'job-1' });
    expect(generationJobMocks.findUnique).toHaveBeenCalledWith({
      where: { id: 'job-1' },
    });
  });

  it('loads a generation job scoped to a user', async () => {
    generationJobMocks.findFirst.mockResolvedValue({ id: 'job-1', userId: 'user-1' });

    await expect(getGenerationJobForUser('job-1', 'user-1')).resolves.toEqual({
      id: 'job-1',
      userId: 'user-1',
    });
    expect(generationJobMocks.findFirst).toHaveBeenCalledWith({
      where: { id: 'job-1', userId: 'user-1' },
    });
  });

  it('returns null when updating a missing job', async () => {
    generationJobMocks.findUnique.mockResolvedValue(null);

    await expect(markGenerationJobProcessing('job-404')).resolves.toBeNull();
    expect(generationJobMocks.update).not.toHaveBeenCalled();
  });

  it('marks a job as processing, done, and failed', async () => {
    generationJobMocks.findUnique.mockResolvedValue({ id: 'job-1' });
    generationJobMocks.update.mockResolvedValue({ id: 'job-1' });

    await markGenerationJobProcessing('job-1');
    await markGenerationJobDone('job-1', 'article-1');
    await markGenerationJobFailed('job-1', 'boom');

    expect(generationJobMocks.update).toHaveBeenNthCalledWith(1, {
      data: {
        errorMsg: null,
        status: 'processing',
      },
      where: {
        id: 'job-1',
      },
    });
    expect(generationJobMocks.update).toHaveBeenNthCalledWith(2, {
      data: {
        articleSlug: 'article-1',
        errorMsg: null,
        status: 'done',
      },
      where: {
        id: 'job-1',
      },
    });
    expect(generationJobMocks.update).toHaveBeenNthCalledWith(3, {
      data: {
        errorMsg: 'boom',
        status: 'failed',
      },
      where: {
        id: 'job-1',
      },
    });
  });
});
