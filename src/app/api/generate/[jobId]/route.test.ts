import { beforeEach, describe, expect, it, vi } from 'vitest';

const generationJobMocks = vi.hoisted(() => ({
  getGenerationJob: vi.fn(),
}));

vi.mock(
  '@/features/generation/generation-job-service',
  () => generationJobMocks,
);

import { GET } from './route';

describe('GET /api/generate/[jobId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when the job is missing', async () => {
    generationJobMocks.getGenerationJob.mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/generate/job-1'),
      {
        params: Promise.resolve({ jobId: 'job-1' }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Job not found' });
  });

  it('returns the job payload when it exists', async () => {
    generationJobMocks.getGenerationJob.mockResolvedValue({
      articleSlug: 'article-1',
      createdAt: '2026-04-09T00:00:00.000Z',
      errorMsg: null,
      id: 'job-1',
      sourceRef: 'https://example.com/article',
      sourceType: 'url',
      status: 'done',
      updatedAt: '2026-04-09T00:01:00.000Z',
    });

    const response = await GET(
      new Request('http://localhost/api/generate/job-1'),
      {
        params: Promise.resolve({ jobId: 'job-1' }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      articleSlug: 'article-1',
      createdAt: '2026-04-09T00:00:00.000Z',
      errorMsg: null,
      id: 'job-1',
      sourceRef: 'https://example.com/article',
      sourceType: 'url',
      status: 'done',
      updatedAt: '2026-04-09T00:01:00.000Z',
    });
  });
});
