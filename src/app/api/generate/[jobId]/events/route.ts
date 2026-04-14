import { getCurrentUser } from '@/features/auth/current-user';
import { getGenerationJobForUser } from '@/features/generation/generation-job-service';
import { listLiveStageDraftsForJob } from '@/features/generation/live-stage-store';
import { isServerLlmDebugEnabled } from '@/features/llm-debug/debug-config';
import { getGenerateJobDebugRecord } from '@/features/llm-debug/debug-store';

const SNAPSHOT_POLL_MS = 1000;
const HEARTBEAT_MS = 15000;

type EventRouteProps = {
  params: Promise<{ jobId: string }>;
};

type GenerationSnapshot = Awaited<
  ReturnType<typeof getGenerationJobForUser>
>;

export const dynamic = 'force-dynamic';

function serializeSnapshot(job: NonNullable<GenerationSnapshot>, llmDebug?: unknown) {
  return {
    articleSlug: job.articleSlug,
    createdAt: job.createdAt,
    currentStep: job.currentStep,
    id: job.id,
    lastError: job.lastError,
    llmDebug,
    revision: job.revision,
    retryable: job.retryable,
    sourceRef: job.sourceRef,
    sourceType: job.sourceType,
    stages: job.stages,
    status: job.status,
    updatedAt: job.updatedAt,
  };
}

function encodeEvent(input: { data: unknown; event: string }) {
  return `event: ${input.event}\ndata: ${JSON.stringify(input.data)}\n\n`;
}

export async function GET(request: Request, { params }: EventRouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { jobId } = await params;
  const existing = await getGenerationJobForUser(jobId, user.id);

  if (!existing || existing.userId !== user.id) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }

  const encoder = new TextEncoder();

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let lastRevision = -1;
  const lastDraftVersions = new Map<string, string>();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const cleanup = () => {
        if (closed) {
          return;
        }

        closed = true;
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
        }
        if (pollTimer) {
          clearInterval(pollTimer);
        }
      };

      const emitState = async () => {
        if (closed || request.signal.aborted) {
          cleanup();
          try {
            controller.close();
          } catch {}
          return;
        }

        const job = await getGenerationJobForUser(jobId, user.id);

        if (!job || job.userId !== user.id) {
          controller.enqueue(
            encoder.encode(
              encodeEvent({
                data: { error: 'Job not found' },
                event: 'error',
              }),
            ),
          );
          cleanup();
          controller.close();
          return;
        }

        if (job.revision !== lastRevision || lastRevision === -1) {
          lastRevision = job.revision;
          const llmDebug = isServerLlmDebugEnabled()
            ? getGenerateJobDebugRecord({
                jobId,
                userId: user.id,
              })
            : undefined;

          controller.enqueue(
            encoder.encode(
              encodeEvent({
                data: serializeSnapshot(job, llmDebug),
                event: 'snapshot',
              }),
            ),
          );
        }

        const liveDrafts = listLiveStageDraftsForJob(jobId);
        for (const draft of liveDrafts) {
          const draftKey = `${draft.stage}:${draft.attempt}`;
          const draftVersion = `${draft.updatedAt}:${draft.text.length}:${draft.status}`;

          if (lastDraftVersions.get(draftKey) === draftVersion) {
            continue;
          }

          lastDraftVersions.set(draftKey, draftVersion);
          controller.enqueue(
            encoder.encode(
              encodeEvent({
                data: draft,
                event: 'stage_draft',
              }),
            ),
          );
        }

        if (job.status === 'done' || job.status === 'failed') {
          cleanup();
          controller.close();
        }
      };

      request.signal.addEventListener(
        'abort',
        () => {
          cleanup();
          try {
            controller.close();
          } catch {}
        },
        { once: true },
      );

      controller.enqueue(encoder.encode('retry: 1000\n\n'));
      void emitState();

      pollTimer = setInterval(() => {
        void emitState();
      }, SNAPSHOT_POLL_MS);

      heartbeatTimer = setInterval(() => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, HEARTBEAT_MS);
    },
    cancel() {
      closed = true;
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  });
}
