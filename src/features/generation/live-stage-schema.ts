import { z } from 'zod';
import { generationStageNameSchema } from './generation-job-schema';

export const liveStageDraftStatusSchema = z.enum([
  'streaming',
  'completed',
  'cleared',
]);

export type LiveStageDraftStatus = z.infer<typeof liveStageDraftStatusSchema>;

export const liveStageDraftSchema = z.object({
  attempt: z.number().int().positive(),
  jobId: z.string().min(1),
  stage: generationStageNameSchema,
  status: liveStageDraftStatusSchema,
  text: z.string(),
  updatedAt: z.string().min(1),
});

export type LiveStageDraft = z.infer<typeof liveStageDraftSchema>;

export function parseLiveStageDraft(value: unknown) {
  return liveStageDraftSchema.parse(value);
}
