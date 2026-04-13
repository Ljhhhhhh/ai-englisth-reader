import { z } from 'zod';
import { memoryTypeSchema } from '@/lib/content/article-schema';

function hasMaxCharacters(value: string, max: number) {
  return Array.from(value).length <= max;
}

export const promptOutputSchema = z.object({
  chinese_title: z.string().trim().min(1),
  list_summary_zh: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) => hasMaxCharacters(value, 100),
      'list_summary_zh must be 100 characters or fewer',
    ),
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
  feynman_summary: z.string(),
  chinese_translation: z.string().trim().min(1),
  paragraph_translations: z.array(z.string().trim().min(1)).min(1),
});

export type PromptOutput = z.infer<typeof promptOutputSchema>;
