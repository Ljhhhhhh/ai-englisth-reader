import { z } from 'zod';

const sentenceSchema = z.object({
  id: z.string(),
  text: z.string(),
  notes: z.array(z.string()).default([]),
});

export const memoryTypeSchema = z.enum([
  '构词助记',
  '核心意象助记',
  '场景助记',
  '搭配助记',
  '近义辨析助记',
]);

export const articleSchema = z.object({
  slug: z.string(),
  title: z.string(),
  source: z.string(),
  difficulty: z.enum(['A2', 'B1', 'B2']),
  estimatedMinutes: z.number().int().positive(),
  feynman_summary: z.string(),
  chinese_translation: z.string(),
  paragraphs: z
    .array(
      z.object({
        id: z.string(),
        sentences: z.array(sentenceSchema).min(1),
      }),
    )
    .min(1),
  growth_vocabulary: z
    .array(
      z.object({
        word: z.string(),
        chinese_meaning: z.string(),
        context_meaning: z.string(),
        memory_type: memoryTypeSchema,
        memory_hook: z.string(),
      }),
    )
    .min(4)
    .max(6),
  high_frequency_phrases: z
    .array(
      z.object({
        phrase: z.string(),
        chinese_meaning: z.string(),
        usage_note: z.string(),
      }),
    )
    .min(2)
    .max(3),
  language_evolution: z.object({
    target_structure: z.string(),
    rewritten_sentence: z.string(),
    explanation: z.string(),
    imitation_example: z.string(),
  }),
});

export type Article = z.infer<typeof articleSchema>;
