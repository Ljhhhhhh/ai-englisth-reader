import { describe, expect, it, vi } from 'vitest';

import { getReadinessSnapshot } from './readiness';

describe('getReadinessSnapshot', () => {
  it('reports ok when env is present and database query succeeds', async () => {
    const snapshot = await getReadinessSnapshot({
      dbClient: {
        $queryRawUnsafe: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      },
      envValues: {
        DATABASE_URL: 'mysql://user:pass@localhost:3306/app',
        LLM_API_KEY: 'secret',
        LLM_BASE_URL: 'https://example.com',
        LLM_MODEL: 'demo-model',
      },
      now: () => new Date('2026-04-11T00:00:00.000Z'),
    });

    expect(snapshot).toEqual({
      checkedAt: '2026-04-11T00:00:00.000Z',
      status: 'ok',
      checks: {
        database: {
          ok: true,
          detail: 'query ok',
        },
        environment: {
          ok: true,
          missing: [],
        },
        llm: {
          configured: true,
          detail: 'LLM credentials configured',
        },
      },
    });
  });

  it('reports error when the database is unreachable', async () => {
    const snapshot = await getReadinessSnapshot({
      dbClient: {
        $queryRawUnsafe: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')),
      },
      envValues: {
        DATABASE_URL: 'mysql://user:pass@localhost:3306/app',
      },
      now: () => new Date('2026-04-11T00:00:00.000Z'),
    });

    expect(snapshot.status).toBe('error');
    expect(snapshot.checks.database).toEqual({
      ok: false,
      detail: 'connect ECONNREFUSED',
    });
    expect(snapshot.checks.llm.configured).toBe(false);
  });

  it('short-circuits when DATABASE_URL is missing', async () => {
    const dbClient = {
      $queryRawUnsafe: vi.fn(),
    };

    const snapshot = await getReadinessSnapshot({
      dbClient,
      envValues: {
        DATABASE_URL: '',
      },
      now: () => new Date('2026-04-11T00:00:00.000Z'),
    });

    expect(snapshot.status).toBe('error');
    expect(snapshot.checks.environment).toEqual({
      ok: false,
      missing: ['DATABASE_URL'],
    });
    expect(snapshot.checks.database).toEqual({
      ok: false,
      detail: 'DATABASE_URL missing',
    });
    expect(dbClient.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('fails fast when the database query hangs', async () => {
    const snapshot = await getReadinessSnapshot({
      dbClient: {
        $queryRawUnsafe: vi.fn(() => new Promise(() => {})),
      },
      envValues: {
        DATABASE_URL: 'mysql://user:pass@localhost:3306/app',
        READINESS_DB_TIMEOUT_MS: 5,
      },
      now: () => new Date('2026-04-11T00:00:00.000Z'),
    });

    expect(snapshot.status).toBe('error');
    expect(snapshot.checks.database).toEqual({
      ok: false,
      detail: 'database readiness timed out after 5ms',
    });
  });
});
