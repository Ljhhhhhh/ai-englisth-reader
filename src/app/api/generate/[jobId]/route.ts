import { getCurrentUser } from '@/features/auth/current-user';
import { getGenerationJobForUser } from '@/features/generation/generation-job-service';
import { isServerLlmDebugEnabled } from '@/features/llm-debug/debug-config';
import { getGenerateJobDebugRecord } from '@/features/llm-debug/debug-store';

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
    currentStep: job.currentStep,
    id: job.id,
    lastError: job.lastError,
    llmDebug: isServerLlmDebugEnabled()
      ? getGenerateJobDebugRecord({
          jobId,
          userId: user.id,
        })
      : undefined,
    revision: job.revision,
    retryable: job.retryable,
    sourceRef: job.sourceRef,
    sourceType: job.sourceType,
    stages: job.stages,
    status: job.status,
    updatedAt: job.updatedAt,
  });
}
