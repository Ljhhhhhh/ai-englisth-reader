import { z } from 'zod';

export const generationStageNameSchema = z.enum([
  'english',
  'vocabulary',
  'grammar',
  'translation',
  'finalize',
]);

export type GenerationStageName = z.infer<typeof generationStageNameSchema>;

export const generationStageStatusSchema = z.enum([
  'pending',
  'running',
  'succeeded',
  'failed',
]);

export type GenerationStageStatus = z.infer<typeof generationStageStatusSchema>;

export const generationStageRecordSchema = z.object({
  status: generationStageStatusSchema,
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  data: z.unknown().optional(),
  error: z
    .object({
      message: z.string(),
    })
    .optional(),
});

export type GenerationStageRecord = z.infer<typeof generationStageRecordSchema>;

export const generationStagesSchema = z.object({
  english: generationStageRecordSchema,
  vocabulary: generationStageRecordSchema,
  grammar: generationStageRecordSchema,
  translation: generationStageRecordSchema,
  finalize: generationStageRecordSchema,
});

export type GenerationStages = z.infer<typeof generationStagesSchema>;

export const generationJobLastErrorSchema = z.object({
  message: z.string(),
  stage: generationStageNameSchema.optional(),
});

export type GenerationJobLastError = z.infer<typeof generationJobLastErrorSchema>;

export function createEmptyGenerationStages(): GenerationStages {
  return {
    english: { status: 'pending' },
    finalize: { status: 'pending' },
    grammar: { status: 'pending' },
    translation: { status: 'pending' },
    vocabulary: { status: 'pending' },
  };
}

export function parseGenerationStages(value: unknown): GenerationStages {
  return generationStagesSchema.parse(value ?? createEmptyGenerationStages());
}

export function parseGenerationJobLastError(value: unknown) {
  if (!value) {
    return null;
  }

  return generationJobLastErrorSchema.parse(value);
}
