import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: dbMocks,
}));

import { GET } from './route';

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 when the database probe succeeds', async () => {
    dbMocks.$queryRaw.mockResolvedValue([{ 1: 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      checks: {
        database: 'ok',
      },
      ok: true,
      service: 'ai-english-read',
      timestamp: expect.any(String),
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(dbMocks.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns 503 when the database probe fails', async () => {
    dbMocks.$queryRaw.mockRejectedValue(new Error('db offline'));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      checks: {
        database: 'error',
      },
      ok: false,
      service: 'ai-english-read',
      timestamp: expect.any(String),
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
