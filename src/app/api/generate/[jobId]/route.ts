import { getGenerationJob } from '@/features/generation/generation-job-service';

type JobRouteProps = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, { params }: JobRouteProps) {
  const { jobId } = await params;
  const job = await getGenerationJob(jobId);

  if (!job) {
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
