import { getReadinessSnapshot } from '@/features/health/readiness';

import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const HEALTH_CHECK_TIMEOUT_MS = 2_000;

function createPayload(ok: boolean, timestamp: string) {
  return {
    checks: {
      database: ok ? 'ok' : 'error',
    },
    ok,
    service: 'ai-english-read',
    timestamp,
  };
}

async function probeDatabase() {
  await Promise.race([
    db.$queryRaw`SELECT 1`,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Database health check timed out'));
      }, HEALTH_CHECK_TIMEOUT_MS);
    }),
  ]);
}

export async function GET() {
  const snapshot = await getReadinessSnapshot();

  try {
    await probeDatabase();

    return NextResponse.json(createPayload(true, timestamp), {
      headers: {
        'cache-control': 'no-store',
      },
      status: 200,
    });
  } catch (error) {
    console.error('Health check failed', error);

    return NextResponse.json(createPayload(false, timestamp), {
      headers: {
        'cache-control': 'no-store',
      },
      status: 503,
    });
  }
}
