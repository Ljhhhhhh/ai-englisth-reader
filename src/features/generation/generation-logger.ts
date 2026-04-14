import * as fsPromises from 'node:fs/promises';
import path from 'node:path';

export const GENERATION_LOG_PATH = path.join(
  process.cwd(),
  'logs',
  'generation.jsonl',
);

type GenerationLogEvent =
  | 'job_created'
  | 'job_claimed'
  | 'job_claim_skipped'
  | 'stage_started'
  | 'stage_succeeded'
  | 'stage_failed'
  | 'job_completed';

export async function appendGenerationLog(input: {
  event: GenerationLogEvent;
  jobId: string;
  payload?: Record<string, unknown>;
  stage?: string;
  userId?: string;
}) {
  try {
    await fsPromises.mkdir(path.dirname(GENERATION_LOG_PATH), { recursive: true });
    await fsPromises.appendFile(
      GENERATION_LOG_PATH,
      `${JSON.stringify({
        event: input.event,
        jobId: input.jobId,
        payload: input.payload,
        stage: input.stage,
        timestamp: new Date().toISOString(),
        userId: input.userId,
      })}\n`,
      'utf8',
    );
  } catch {
    // Logging is best-effort only.
  }
}
