import { getCurrentUser } from '@/features/auth/current-user';
import {
  getGenerationJobForUser,
  startOrResumeGenerationJob,
} from '@/features/generation/generation-job-service';

type RetryRouteProps = {
  params: Promise<{ jobId: string }>;
};

function isClaimStale(claimedUntil: Date | string | null | undefined) {
  if (!claimedUntil) {
    return false;
  }

  const value =
    claimedUntil instanceof Date
      ? claimedUntil.getTime()
      : new Date(claimedUntil).getTime();

  return value < Date.now();
}

export async function POST(_request: Request, { params }: RetryRouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { jobId } = await params;
  const job = await getGenerationJobForUser(jobId, user.id);

  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }

  const retryable = job.retryable || isClaimStale(job.claimedUntil);

  if (!retryable) {
    return Response.json({ error: '当前任务不可重试。' }, { status: 409 });
  }

  const resumed = await startOrResumeGenerationJob({
    jobId,
    triggeredBy: `retry:${user.id}`,
  });

  return Response.json(
    {
      id: resumed?.id ?? jobId,
      status: resumed?.status ?? 'processing',
    },
    { status: 202 },
  );
}
