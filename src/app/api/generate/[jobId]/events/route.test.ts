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

const liveDraftStoreMocks = vi.hoisted(() => ({
  listLiveStageDraftsForJob: vi.fn(),
}));

vi.mock('@/features/auth/current-user', () => currentUserMocks);
vi.mock('@/features/generation/generation-job-service', () => generationJobMocks);
vi.mock('@/features/llm-debug/debug-config', () => debugConfigMocks);
vi.mock('@/features/llm-debug/debug-store', () => debugStoreMocks);
vi.mock('@/features/generation/live-stage-store', () => liveDraftStoreMocks);

import { GET } from './route';

function createJobSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    articleSlug: null,
    createdAt: '2026-04-14T00:00:00.000Z',
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
    updatedAt: '2026-04-14T00:00:01.000Z',
    userId: 'user-1',
    ...overrides,
  };
}

async function readEventText(response: Response, reads = 3) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('expected response body');
  }

  let text = '';
  for (let index = 0; index < reads; index += 1) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    text += new TextDecoder().decode(value);
  }

  await reader.cancel();
  return text;
}

describe('GET /api/generate/[jobId]/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserMocks.getCurrentUser.mockResolvedValue({ id: 'user-1' });
    debugConfigMocks.isServerLlmDebugEnabled.mockReturnValue(false);
    generationJobMocks.getGenerationJobForUser.mockResolvedValue(
      createJobSnapshot(),
    );
    liveDraftStoreMocks.listLiveStageDraftsForJob.mockReturnValue([]);
  });

  it('returns the initial durable snapshot immediately', async () => {
    const response = await GET(
      new Request('http://localhost/api/generate/job-1/events'),
      {
        params: Promise.resolve({ jobId: 'job-1' }),
      },
    );

    expect(response.status).toBe(200);
    const text = await readEventText(response, 2);

    expect(text).toContain('retry: 1000');
    expect(text).toContain('event: snapshot');
    expect(text).toContain('"revision":1');
  });

  it('emits live draft events alongside durable snapshots when drafts exist', async () => {
    liveDraftStoreMocks.listLiveStageDraftsForJob.mockReturnValue([
      {
        attempt: 1,
        jobId: 'job-1',
        stage: 'english',
        status: 'streaming',
        text: 'Draft article opening',
        updatedAt: '2026-04-14T00:00:02.000Z',
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/generate/job-1/events'),
      {
        params: Promise.resolve({ jobId: 'job-1' }),
      },
    );

    const text = await readEventText(response, 3);

    expect(text).toContain('event: snapshot');
    expect(text).toContain('event: stage_draft');
    expect(text).toContain('"stage":"english"');
    expect(text).toContain('"text":"Draft article opening"');
  });
});
