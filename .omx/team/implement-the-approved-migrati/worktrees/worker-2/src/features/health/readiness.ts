import { db } from '@/lib/db';
import { env } from '@/lib/env';

export type ReadinessStatus = 'ok' | 'error';

type QueryableDb = {
  $queryRawUnsafe(query: string): Promise<unknown>;
};

type ReadinessEnv = {
  DATABASE_URL: string;
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
  READINESS_DB_TIMEOUT_MS?: number;
};

export type ReadinessSnapshot = {
  checkedAt: string;
  status: ReadinessStatus;
  checks: {
    database: {
      ok: boolean;
      detail: string;
    };
    environment: {
      ok: boolean;
      missing: string[];
    };
    llm: {
      configured: boolean;
      detail: string;
    };
  };
};

async function queryWithTimeout(dbClient: QueryableDb, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      dbClient.$queryRawUnsafe('SELECT 1'),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`database readiness timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function getReadinessSnapshot({
  dbClient = db,
  envValues = env,
  now = () => new Date(),
}: {
  dbClient?: QueryableDb;
  envValues?: ReadinessEnv;
  now?: () => Date;
} = {}): Promise<ReadinessSnapshot> {
  const missingEnv = envValues.DATABASE_URL ? [] : ['DATABASE_URL'];
  const dbTimeoutMs = envValues.READINESS_DB_TIMEOUT_MS ?? 1000;

  let databaseOk = false;
  let databaseDetail = 'skipped';

  if (missingEnv.length === 0) {
    try {
      await queryWithTimeout(dbClient, dbTimeoutMs);
      databaseOk = true;
      databaseDetail = 'query ok';
    } catch (error) {
      databaseDetail =
        error instanceof Error ? error.message : 'database readiness failed';
    }
  } else {
    databaseDetail = 'DATABASE_URL missing';
  }

  const llmConfigured = Boolean(envValues.LLM_API_KEY);

  return {
    checkedAt: now().toISOString(),
    status: missingEnv.length === 0 && databaseOk ? 'ok' : 'error',
    checks: {
      database: {
        ok: databaseOk,
        detail: databaseDetail,
      },
      environment: {
        ok: missingEnv.length === 0,
        missing: missingEnv,
      },
      llm: {
        configured: llmConfigured,
        detail: llmConfigured
          ? 'LLM credentials configured'
          : 'LLM credentials missing; generation endpoints should stay out of the smoke path',
      },
    },
  };
}
