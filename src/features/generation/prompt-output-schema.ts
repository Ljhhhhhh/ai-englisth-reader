import { z } from 'zod';
import { memoryTypeSchema } from '@/lib/content/article-schema';

export const promptOutputSchema = z.object({
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
  chinese_translation: z.string(),
});

export type PromptOutput = z.infer<typeof promptOutputSchema>;
