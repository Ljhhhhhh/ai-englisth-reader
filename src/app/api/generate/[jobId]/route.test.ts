import { beforeEach, describe, expect, it, vi } from 'vitest';

const currentUserMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const generationJobMocks = vi.hoisted(() => ({
  getGenerationJobForUser: vi.fn(),
}));

const debugConfigMocks = vi.hoisted(() => ({
  isServerLlmDebugEnabled: vi.fn(),
}));

const debugStoreMocks = vi.hoisted(() => ({
  getGenerateJobDebugRecord: vi.fn(),
}));

vi.mock('@/features/auth/current-user', () => currentUserMocks);
vi.mock('@/features/generation/generation-job-service', () => generationJobMocks);
vi.mock('@/features/llm-debug/debug-config', () => debugConfigMocks);
vi.mock('@/features/llm-debug/debug-store', () => debugStoreMocks);

import { GET } from './route';

describe('GET /api/generate/[jobId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserMocks.getCurrentUser.mockResolvedValue({
      email: 'reader@example.com',
      id: 'user-1',
    });
    debugConfigMocks.isServerLlmDebugEnabled.mockReturnValue(true);
    debugStoreMocks.getGenerateJobDebugRecord.mockReturnValue({
      callId: 'call-1',
      error: null,
      meta: { durationMs: 120 },
      rawOutput: {
        available: true,
        preview: '{"ok":true}',
        truncated: false,
      },
      status: 'success',
      structuredResult: {
        data: { ok: true },
        status: 'success',
      },
      summary: {
        callType: 'generate',
        model: 'test-model',
        trigger: 'generate_page',
      },
      timestamp: '2026-04-14T00:00:00.000Z',
    });
  });

  it('returns 401 for unauthenticated requests', async () => {
    currentUserMocks.getCurrentUser.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/generate/job-1'), {
      params: Promise.resolve({ jobId: 'job-1' }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Authentication required',
    });
  });

  it('returns 404 when the job is missing for the authenticated user', async () => {
    currentUserMocks.getCurrentUser.mockResolvedValue({ id: 'user-1' });
    generationJobMocks.getGenerationJobForUser.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/generate/job-1'), {
      params: Promise.resolve({ jobId: 'job-1' }),
    });

    expect(generationJobMocks.getGenerationJobForUser).toHaveBeenCalledWith(
      'job-1',
      'user-1',
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Job not found' });
  });

  it('returns the expanded job snapshot when it belongs to the authenticated user', async () => {
    currentUserMocks.getCurrentUser.mockResolvedValue({ id: 'user-1' });
    generationJobMocks.getGenerationJobForUser.mockResolvedValue({
      articleSlug: 'article-1',
      claimToken: null,
      claimedUntil: null,
      createdAt: '2026-04-09T00:00:00.000Z',
      currentStep: 'finalize',
      id: 'job-1',
      lastError: null,
      revision: 5,
      retryable: false,
      sourceRef: 'https://example.com/article',
      sourceType: 'url',
      stages: {
        english: { data: { feynman_summary: 'hello world' }, status: 'succeeded' },
        finalize: { status: 'succeeded' },
        grammar: { status: 'succeeded' },
        translation: { status: 'succeeded' },
        vocabulary: { status: 'succeeded' },
      },
      status: 'done',
      updatedAt: '2026-04-09T00:01:00.000Z',
      userId: 'user-1',
    });

    const response = await GET(new Request('http://localhost/api/generate/job-1'), {
      params: Promise.resolve({ jobId: 'job-1' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      articleSlug: 'article-1',
      createdAt: '2026-04-09T00:00:00.000Z',
      currentStep: 'finalize',
      id: 'job-1',
      lastError: null,
      llmDebug: {
        callId: 'call-1',
        error: null,
        meta: { durationMs: 120 },
        rawOutput: {
          available: true,
          preview: '{"ok":true}',
          truncated: false,
        },
        status: 'success',
        structuredResult: {
          data: { ok: true },
          status: 'success',
        },
        summary: {
          callType: 'generate',
          model: 'test-model',
          trigger: 'generate_page',
        },
        timestamp: '2026-04-14T00:00:00.000Z',
      },
      revision: 5,
      retryable: false,
      sourceRef: 'https://example.com/article',
      sourceType: 'url',
      stages: {
        english: { data: { feynman_summary: 'hello world' }, status: 'succeeded' },
        finalize: { status: 'succeeded' },
        grammar: { status: 'succeeded' },
        translation: { status: 'succeeded' },
        vocabulary: { status: 'succeeded' },
      },
      status: 'done',
      updatedAt: '2026-04-09T00:01:00.000Z',
    });
  });

  it('omits llmDebug when server debug is disabled', async () => {
    currentUserMocks.getCurrentUser.mockResolvedValue({ id: 'user-1' });
    debugConfigMocks.isServerLlmDebugEnabled.mockReturnValue(false);
    generationJobMocks.getGenerationJobForUser.mockResolvedValue({
      articleSlug: null,
      claimToken: null,
      claimedUntil: null,
      createdAt: '2026-04-09T00:00:00.000Z',
      currentStep: 'english',
      id: 'job-1',
      lastError: null,
      revision: 1,
      retryable: false,
      sourceRef: 'https://example.com/article',
      sourceType: 'url',
      stages: {
        english: { status: 'running' },
        finalize: { status: 'pending' },
        grammar: { status: 'pending' },
        translation: { status: 'pending' },
        vocabulary: { status: 'pending' },
      },
      status: 'processing',
      updatedAt: '2026-04-09T00:01:00.000Z',
      userId: 'user-1',
    });

    const response = await GET(new Request('http://localhost/api/generate/job-1'), {
      params: Promise.resolve({ jobId: 'job-1' }),
    });

    await expect(response.json()).resolves.toEqual({
      articleSlug: null,
      createdAt: '2026-04-09T00:00:00.000Z',
      currentStep: 'english',
      id: 'job-1',
      lastError: null,
      revision: 1,
      retryable: false,
      sourceRef: 'https://example.com/article',
      sourceType: 'url',
      stages: {
        english: { status: 'running' },
        finalize: { status: 'pending' },
        grammar: { status: 'pending' },
        translation: { status: 'pending' },
        vocabulary: { status: 'pending' },
      },
      status: 'processing',
      updatedAt: '2026-04-09T00:01:00.000Z',
    });
    expect(debugStoreMocks.getGenerateJobDebugRecord).not.toHaveBeenCalled();
  });
});
