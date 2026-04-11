import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await db.$queryRaw`SELECT 1`;

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
