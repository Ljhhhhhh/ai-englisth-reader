import { getReadinessSnapshot } from '@/features/health/readiness';

export const runtime = 'nodejs';

export async function GET() {
  const snapshot = await getReadinessSnapshot();

  return Response.json(snapshot, {
    status: snapshot.status === 'ok' ? 200 : 503,
  });
}
