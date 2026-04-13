import { NextResponse } from 'next/server';

import { getReadinessSnapshot } from '@/features/health/readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshot = await getReadinessSnapshot();

  return NextResponse.json(snapshot, {
    headers: {
      'cache-control': 'no-store',
    },
    status: snapshot.status === 'ok' ? 200 : 503,
  });
}
