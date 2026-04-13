import { beforeEach, describe, expect, it, vi } from 'vitest';

const readinessMocks = vi.hoisted(() => ({
  getReadinessSnapshot: vi.fn(),
}));

vi.mock('@/features/health/readiness', () => readinessMocks);

import { GET } from './route';

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 when readiness is ok', async () => {
    readinessMocks.getReadinessSnapshot.mockResolvedValue({
      checkedAt: '2026-04-11T00:00:00.000Z',
      status: 'ok',
      checks: {
        database: { ok: true, detail: 'query ok' },
        environment: { ok: true, missing: [] },
        llm: { configured: true, detail: 'LLM credentials configured' },
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      checkedAt: '2026-04-11T00:00:00.000Z',
      status: 'ok',
      checks: {
        database: { ok: true, detail: 'query ok' },
        environment: { ok: true, missing: [] },
        llm: { configured: true, detail: 'LLM credentials configured' },
      },
    });
  });

  it('returns 503 when readiness is error', async () => {
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
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      checkedAt: '2026-04-11T00:00:00.000Z',
      status: 'error',
      checks: {
        database: { ok: false, detail: 'connect ECONNREFUSED' },
        environment: { ok: true, missing: [] },
        llm: { configured: false, detail: 'LLM credentials missing' },
      },
    });
  });
});
