import { beforeEach, describe, expect, it, vi } from 'vitest';

const currentUserMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const generationJobMocks = vi.hoisted(() => ({
  createGenerationJob: vi.fn(),
  startOrResumeGenerationJob: vi.fn(),
}));

const generationContentMocks = vi.hoisted(() => ({
  extractContent: vi.fn(),
}));

const generationLoggerMocks = vi.hoisted(() => ({
  appendGenerationLog: vi.fn(),
}));

vi.mock('@/features/generation/generation-job-service', () => generationJobMocks);
vi.mock('@/features/auth/current-user', () => currentUserMocks);
vi.mock('@/features/generation/extract-content', () => generationContentMocks);
vi.mock('@/features/generation/generation-logger', () => generationLoggerMocks);

import { POST } from './route';

function createFormRequest(formData: FormData) {
  return new Request('http://localhost/api/generate', {
    body: formData,
    method: 'POST',
  });
}

describe('POST /api/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserMocks.getCurrentUser.mockResolvedValue({
      email: 'reader@example.com',
      id: 'user-1',
    });
  });

  it('rejects unauthenticated requests', async () => {
    currentUserMocks.getCurrentUser.mockResolvedValue(null);

    const formData = new FormData();
    formData.set('url', 'https://example.com/article');

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: '请先登录后再生成文章。',
    });
  });

  it('extracts canonical url content before returning 202 and queues same-job resume', async () => {
    generationJobMocks.createGenerationJob.mockResolvedValue({
      id: 'job-1',
      status: 'pending',
    });
    generationJobMocks.startOrResumeGenerationJob.mockResolvedValue(null);
    generationLoggerMocks.appendGenerationLog.mockResolvedValue(undefined);
    generationContentMocks.extractContent.mockResolvedValue({
      source: 'https://example.com/article',
      text: 'raw content',
      titleHint: 'Article Title',
    });

    const formData = new FormData();
    formData.set('url', ' https://example.com/article ');

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      id: 'job-1',
      status: 'pending',
    });

    expect(generationContentMocks.extractContent).toHaveBeenCalledWith({
      type: 'url',
      url: 'https://example.com/article',
    });
    expect(generationJobMocks.createGenerationJob).toHaveBeenCalledWith({
      canonicalSource: 'https://example.com/article',
      canonicalText: 'raw content',
      canonicalTitleHint: 'Article Title',
      id: expect.any(String),
      reservedArticleSlug: expect.stringContaining('article-title'),
      sourceRef: 'https://example.com/article',
      sourceType: 'url',
      userId: 'user-1',
    });
    expect(generationLoggerMocks.appendGenerationLog).toHaveBeenCalledWith({
      event: 'job_created',
      jobId: 'job-1',
      payload: {
        sourceRef: 'https://example.com/article',
        sourceType: 'url',
        titleHint: 'Article Title',
        triggeredBy: 'route:create',
      },
      userId: 'user-1',
    });

    await vi.waitFor(() => {
      expect(generationJobMocks.startOrResumeGenerationJob).toHaveBeenCalledWith({
        jobId: 'job-1',
        triggeredBy: 'create:user-1',
      });
    });
  });

  it('uses extracted file content as canonical input and queues same-job resume', async () => {
    generationJobMocks.createGenerationJob.mockResolvedValue({
      id: 'job-2',
      status: 'pending',
    });
    generationJobMocks.startOrResumeGenerationJob.mockResolvedValue(null);
    generationLoggerMocks.appendGenerationLog.mockResolvedValue(undefined);
    generationContentMocks.extractContent.mockResolvedValue({
      source: 'my-article.txt',
      text: 'raw content',
      titleHint: 'Article Title',
    });

    const formData = new FormData();
    formData.set(
      'file',
      new File(['hello'], 'my-article.txt', { type: 'text/plain' }),
    );

    const response = await POST({
      formData: async () => formData,
    } as Request);

    expect(response.status).toBe(202);
    expect(generationContentMocks.extractContent).toHaveBeenCalledWith({
      type: 'file',
      file: expect.any(File),
    });
    expect(generationJobMocks.createGenerationJob).toHaveBeenCalledWith({
      canonicalSource: 'my-article.txt',
      canonicalText: 'raw content',
      canonicalTitleHint: 'Article Title',
      id: expect.any(String),
      reservedArticleSlug: expect.stringContaining('article-title'),
      sourceRef: 'my-article.txt',
      sourceType: 'file',
      userId: 'user-1',
    });
    expect(generationLoggerMocks.appendGenerationLog).toHaveBeenCalledWith({
      event: 'job_created',
      jobId: 'job-2',
      payload: {
        sourceRef: 'my-article.txt',
        sourceType: 'file',
        titleHint: 'Article Title',
        triggeredBy: 'route:create',
      },
      userId: 'user-1',
    });

    await vi.waitFor(() => {
      expect(generationJobMocks.startOrResumeGenerationJob).toHaveBeenCalledWith({
        jobId: 'job-2',
        triggeredBy: 'create:user-1',
      });
    });
  });
});
