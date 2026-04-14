import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const generationJobMocks = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    generationJob: generationJobMocks,
  },
}));

import {
  claimGenerationJob,
  countRecentGenerationJobs,
  createGenerationJob,
  getGenerationJob,
  getGenerationJobForUser,
  setGenerationJobFailure,
  updateGenerationJobStage,
} from './generation-job-service';

describe('generation-job-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a stage-aware generation job with canonical input and reserved slug', async () => {
    generationJobMocks.create.mockResolvedValue({ id: 'job-1' });

    const job = await createGenerationJob({
      canonicalSource: 'https://example.com/article',
      canonicalText: 'normalized content',
      canonicalTitleHint: 'Article Title',
      id: 'job-1',
      reservedArticleSlug: 'article-title-job-1',
      sourceRef: 'https://example.com/article',
      sourceType: 'url',
      userId: 'user-1',
    });

    expect(generationJobMocks.create).toHaveBeenCalledWith({
      data: {
        activeAttempt: 0,
        articleSlug: null,
        canonicalSource: 'https://example.com/article',
        canonicalText: 'normalized content',
        canonicalTitleHint: 'Article Title',
        claimToken: null,
        claimedBy: null,
        claimedUntil: null,
        currentStep: null,
        id: 'job-1',
        lastErrorJson: Prisma.JsonNull,
        reservedArticleSlug: 'article-title-job-1',
        retryable: false,
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
    generationJobMocks.findFirst.mockResolvedValue({
      articleSlug: null,
      claimToken: null,
      claimedUntil: null,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      currentStep: null,
      id: 'job-1',
      lastErrorJson: null,
      reservedArticleSlug: 'article-title-job-1',
      retryable: false,
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
      updatedAt: new Date('2026-04-14T00:00:00.000Z'),
      userId: 'user-1',
    });

    await expect(getGenerationJobForUser('job-1', 'user-1')).resolves.toMatchObject({
      id: 'job-1',
      retryable: false,
      stages: {
        english: { status: 'pending' },
      },
      userId: 'user-1',
    });
    expect(generationJobMocks.findFirst).toHaveBeenCalledWith({
      where: { id: 'job-1', userId: 'user-1' },
    });
  });

  it('claims a job only when the claim is absent or expired', async () => {
    generationJobMocks.updateMany.mockResolvedValue({ count: 1 });
    generationJobMocks.findUnique.mockResolvedValue({ id: 'job-1', revision: 1 });

    const now = new Date('2026-04-14T00:59:00.000Z');
    const claimedUntil = new Date('2026-04-14T01:00:00.000Z');
    const job = await claimGenerationJob({
      claimToken: 'claim-1',
      claimedBy: 'runner-1',
      claimedUntil,
      id: 'job-1',
      now,
    });

    expect(generationJobMocks.updateMany).toHaveBeenCalledWith({
      data: {
        activeAttempt: {
          increment: 1,
        },
        claimToken: 'claim-1',
        claimedBy: 'runner-1',
        claimedUntil,
      },
      where: {
        id: 'job-1',
        OR: [
          { claimToken: null },
          { claimedUntil: { lt: now } },
        ],
      },
    });
    expect(job).toEqual({ id: 'job-1', revision: 1 });
  });

  it('writes a stage result only when the claim token and revision still match', async () => {
    generationJobMocks.findUnique.mockResolvedValue({
      id: 'job-1',
      revision: 2,
      stagesJson: {
        english: { status: 'pending' },
        finalize: { status: 'pending' },
        grammar: { status: 'pending' },
        translation: { status: 'pending' },
        vocabulary: { status: 'pending' },
      },
    });
    generationJobMocks.updateMany.mockResolvedValue({ count: 1 });
    generationJobMocks.findUnique.mockResolvedValueOnce({
      id: 'job-1',
      revision: 2,
      stagesJson: {
        english: { status: 'pending' },
        finalize: { status: 'pending' },
        grammar: { status: 'pending' },
        translation: { status: 'pending' },
        vocabulary: { status: 'pending' },
      },
    });
    generationJobMocks.findUnique.mockResolvedValueOnce({
      id: 'job-1',
      revision: 3,
    });

    const job = await updateGenerationJobStage({
      claimToken: 'claim-1',
      id: 'job-1',
      nextStatus: 'processing',
      revision: 2,
      stage: 'english',
      stageData: {
        startedAt: '2026-04-14T01:00:00.000Z',
        status: 'running',
      },
    });

    expect(generationJobMocks.updateMany).toHaveBeenCalledWith({
      data: {
        currentStep: 'english',
        revision: {
          increment: 1,
        },
        stagesJson: {
          english: {
            startedAt: '2026-04-14T01:00:00.000Z',
            status: 'running',
          },
          finalize: { status: 'pending' },
          grammar: { status: 'pending' },
          translation: { status: 'pending' },
          vocabulary: { status: 'pending' },
        },
        status: 'processing',
      },
      where: {
        claimToken: 'claim-1',
        id: 'job-1',
        revision: 2,
      },
    });
    expect(job).toEqual({ id: 'job-1', revision: 3 });
  });

  it('truncates errorMsg while preserving the full failure in lastErrorJson', async () => {
    generationJobMocks.findUnique.mockResolvedValue({
      currentStep: 'grammar',
      id: 'job-1',
      stagesJson: {
        english: { status: 'succeeded' },
        finalize: { status: 'pending' },
        grammar: { status: 'running' },
        translation: { status: 'pending' },
        vocabulary: { status: 'succeeded' },
      },
    });
    generationJobMocks.update.mockResolvedValue({ id: 'job-1' });

    const longMessage = 'x'.repeat(260);
    await setGenerationJobFailure({
      id: 'job-1',
      message: longMessage,
      stage: 'grammar',
    });

    expect(generationJobMocks.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        errorMsg: `${'x'.repeat(190)}…`,
        lastErrorJson: {
          message: longMessage,
          stage: 'grammar',
        },
      }),
      where: {
        id: 'job-1',
      },
    });
  });
});
