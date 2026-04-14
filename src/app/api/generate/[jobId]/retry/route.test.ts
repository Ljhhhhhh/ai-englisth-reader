import { beforeEach, describe, expect, it, vi } from 'vitest';

const currentUserMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const generationJobMocks = vi.hoisted(() => ({
  getGenerationJobForUser: vi.fn(),
  startOrResumeGenerationJob: vi.fn(),
}));

vi.mock('@/features/auth/current-user', () => currentUserMocks);
vi.mock('@/features/generation/generation-job-service', () => generationJobMocks);

import { POST } from './route';

describe('POST /api/generate/[jobId]/retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserMocks.getCurrentUser.mockResolvedValue({
      id: 'user-1',
    });
  });

  it('restarts the same job when it is retryable', async () => {
    generationJobMocks.getGenerationJobForUser.mockResolvedValue({
      id: 'job-1',
      retryable: true,
      status: 'failed',
      userId: 'user-1',
    });
    generationJobMocks.startOrResumeGenerationJob.mockResolvedValue({
      id: 'job-1',
      status: 'processing',
    });

    const response = await POST(
      new Request('http://localhost/api/generate/job-1/retry', {
        method: 'POST',
      }),
      {
        params: Promise.resolve({ jobId: 'job-1' }),
      },
    );

    expect(response.status).toBe(202);
    expect(generationJobMocks.startOrResumeGenerationJob).toHaveBeenCalledWith({
      jobId: 'job-1',
      triggeredBy: 'retry:user-1',
    });
    await expect(response.json()).resolves.toEqual({
      id: 'job-1',
      status: 'processing',
    });
  });

  it('rejects retry when the job is not retryable and still actively claimed', async () => {
    generationJobMocks.getGenerationJobForUser.mockResolvedValue({
      claimToken: 'claim-1',
      claimedUntil: '2099-04-14T02:00:00.000Z',
      id: 'job-1',
      retryable: false,
      status: 'processing',
      userId: 'user-1',
    });

    const response = await POST(
      new Request('http://localhost/api/generate/job-1/retry', {
        method: 'POST',
      }),
      {
        params: Promise.resolve({ jobId: 'job-1' }),
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: '当前任务不可重试。',
    });
    expect(generationJobMocks.startOrResumeGenerationJob).not.toHaveBeenCalled();
  });
});
