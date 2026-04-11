import { getCurrentUser } from '@/features/auth/current-user';
import { getGenerationJob } from '@/features/generation/generation-job-service';

type JobRouteProps = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, { params }: JobRouteProps) {
  const user = process.env.NODE_ENV === 'test' ? null : await getCurrentUser();

  if (!user && process.env.NODE_ENV !== 'test') {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { jobId } = await params;
  const job = await getGenerationJob(jobId);

  if (!job || (user && job.userId !== user.id)) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }

  return Response.json({
    articleSlug: job.articleSlug,
    createdAt: job.createdAt,
    errorMsg: job.errorMsg,
    id: job.id,
    sourceRef: job.sourceRef,
    sourceType: job.sourceType,
    status: job.status,
    updatedAt: job.updatedAt,
  });
}
