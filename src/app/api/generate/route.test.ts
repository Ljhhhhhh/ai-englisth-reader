import { beforeEach, describe, expect, it, vi } from 'vitest';

const currentUserMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const generationJobMocks = vi.hoisted(() => ({
  countRecentGenerationJobs: vi.fn(),
  createGenerationJob: vi.fn(),
  markGenerationJobDone: vi.fn(),
  markGenerationJobFailed: vi.fn(),
  markGenerationJobProcessing: vi.fn(),
}));

const generationContentMocks = vi.hoisted(() => ({
  extractContent: vi.fn(),
  generateArticle: vi.fn(),
}));

vi.mock(
  '@/features/generation/generation-job-service',
  () => generationJobMocks,
);
vi.mock('@/features/auth/current-user', () => currentUserMocks);
vi.mock('@/features/generation/extract-content', () => generationContentMocks);
vi.mock(
  '@/features/generation/article-generator',
  () => generationContentMocks,
);

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

  it('enforces the daily generation limit per authenticated user', async () => {
    currentUserMocks.getCurrentUser.mockResolvedValue({
      email: 'reader@example.com',
      id: 'user-1',
    });
    generationJobMocks.countRecentGenerationJobs.mockResolvedValue(5);

    const formData = new FormData();
    formData.set('url', 'https://example.com/article');

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(429);
    expect(generationJobMocks.countRecentGenerationJobs).toHaveBeenCalledWith(
      'user-1',
      expect.any(Date),
    );
    expect(generationJobMocks.createGenerationJob).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: '今日生成次数已用完，请明天再试。',
    });
  });

  it('creates a job for url input and starts async processing', async () => {
    currentUserMocks.getCurrentUser.mockResolvedValue({
      email: 'reader@example.com',
      id: 'user-1',
    });
    generationJobMocks.countRecentGenerationJobs.mockResolvedValue(1);
    generationJobMocks.createGenerationJob.mockResolvedValue({
      id: 'job-1',
      status: 'pending',
    });
    generationJobMocks.markGenerationJobProcessing.mockResolvedValue(null);
    generationJobMocks.markGenerationJobDone.mockResolvedValue(null);
    generationContentMocks.extractContent.mockResolvedValue({
      source: 'https://example.com/article',
      text: 'raw content',
      titleHint: 'Article Title',
    });
    generationContentMocks.generateArticle.mockResolvedValue({
      slug: 'article-slug',
    });

    const formData = new FormData();
    formData.set('url', ' https://example.com/article ');

    const response = await POST(createFormRequest(formData));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      id: 'job-1',
      limit: 5,
      remaining: 3,
      status: 'pending',
    });

    expect(generationJobMocks.createGenerationJob).toHaveBeenCalledWith({
      sourceRef: 'https://example.com/article',
      sourceType: 'url',
      userId: 'user-1',
    });

    await vi.waitFor(() => {
      expect(
        generationJobMocks.markGenerationJobProcessing,
      ).toHaveBeenCalledWith('job-1');
      expect(generationContentMocks.extractContent).toHaveBeenCalledWith({
        type: 'url',
        url: 'https://example.com/article',
      });
      expect(generationContentMocks.generateArticle).toHaveBeenCalledWith({
        ownerId: 'user-1',
        source: 'https://example.com/article',
        text: 'raw content',
        titleHint: 'Article Title',
      });
      expect(generationJobMocks.markGenerationJobDone).toHaveBeenCalledWith(
        'job-1',
        'article-slug',
      );
    });
  });

  it('uses the uploaded filename as the source ref', async () => {
    currentUserMocks.getCurrentUser.mockResolvedValue({
      email: 'reader@example.com',
      id: 'user-1',
    });
    generationJobMocks.countRecentGenerationJobs.mockResolvedValue(0);
    generationJobMocks.createGenerationJob.mockResolvedValue({
      id: 'job-2',
      status: 'pending',
    });
    generationJobMocks.markGenerationJobProcessing.mockResolvedValue(null);
    generationJobMocks.markGenerationJobDone.mockResolvedValue(null);
    generationContentMocks.extractContent.mockResolvedValue({
      source: 'my-article.txt',
      text: 'raw content',
      titleHint: 'Article Title',
    });
    generationContentMocks.generateArticle.mockResolvedValue({
      slug: 'article-slug',
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
    expect(generationJobMocks.createGenerationJob).toHaveBeenCalledWith({
      sourceRef: 'my-article.txt',
      sourceType: 'file',
      userId: 'user-1',
    });

    await vi.waitFor(() => {
      expect(generationContentMocks.extractContent).toHaveBeenCalledWith({
        type: 'file',
        file: expect.any(File),
      });
      expect(generationContentMocks.generateArticle).toHaveBeenCalledWith({
        ownerId: 'user-1',
        source: 'my-article.txt',
        text: 'raw content',
        titleHint: 'Article Title',
      });
    });
  });
});
