import { getCurrentUser } from '@/features/auth/current-user';
import { getGenerationJobForUser } from '@/features/generation/generation-job-service';

type JobRouteProps = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, { params }: JobRouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { jobId } = await params;
  const job = await getGenerationJobForUser(jobId, user.id);

  if (!job || job.userId !== user.id) {
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
