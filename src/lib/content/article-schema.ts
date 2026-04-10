import { z } from 'zod';

const sentenceSchema = z.object({
  id: z.string(),
  text: z.string(),
  notes: z.array(z.string()).default([]),
});

function hasMaxCharacters(value: string, max: number) {
  return Array.from(value).length <= max;
}

const paragraphSchema = z.object({
  id: z.string(),
  translation: z.string().trim().min(1),
  sentences: z.array(sentenceSchema).min(1),
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
  title: z.string().trim().min(1),
  chinese_title: z.string().trim().min(1),
  source: z.string(),
  difficulty: z.enum(['A2', 'B1', 'B2']),
  estimatedMinutes: z.number().int().positive(),
  list_summary_zh: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) => hasMaxCharacters(value, 100),
      'list_summary_zh must be 100 characters or fewer',
    ),
  feynman_summary: z.string(),
  chinese_translation: z.string().trim().min(1),
  paragraphs: z.array(paragraphSchema).min(1),
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
