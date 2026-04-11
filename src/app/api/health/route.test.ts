import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const readinessMocks = vi.hoisted(() => ({
  getReadinessSnapshot: vi.fn(),
}));

vi.mock('@/features/health/readiness', () => readinessMocks);

import { GET } from './route';

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 200 when the database probe succeeds', async () => {
    dbMocks.$queryRaw.mockResolvedValue([{ 1: 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
    });
  });

  it('returns 503 when readiness fails', async () => {
    readinessMocks.getReadinessSnapshot.mockResolvedValue({
      checkedAt: '2026-04-11T00:00:00.000Z',
      status: 'error',
      checks: {
        database: { ok: false, detail: 'connect ECONNREFUSED' },
        environment: { ok: true, missing: [] },
        llm: { configured: false, detail: 'LLM credentials missing' },
      },
    });

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'error',
    });
  });

  it('returns 503 when the database probe times out', async () => {
    vi.useFakeTimers();
    dbMocks.$queryRaw.mockReturnValue(new Promise(() => {}));

    const responsePromise = GET();
    await vi.advanceTimersByTimeAsync(2_000);
    const response = await responsePromise;

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      checks: {
        database: 'error',
      },
      ok: false,
      service: 'ai-english-read',
      timestamp: expect.any(String),
    });
  });

  it('returns 503 when the database probe times out', async () => {
    vi.useFakeTimers();
    dbMocks.$queryRaw.mockReturnValue(new Promise(() => {}));

    const responsePromise = GET();
    await vi.advanceTimersByTimeAsync(2_000);
    const response = await responsePromise;

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      checks: {
        database: 'error',
      },
      ok: false,
      service: 'ai-english-read',
      timestamp: expect.any(String),
    });
  });
});
