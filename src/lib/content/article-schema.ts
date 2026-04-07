import { z } from "zod";

const sentenceSchema = z.object({
  id: z.string(),
  text: z.string(),
  notes: z.array(z.string()).default([]),
});

export const articleSchema = z.object({
  slug: z.string(),
  title: z.string(),
  source: z.string(),
  difficulty: z.enum(["A2", "B1", "B2"]),
  estimatedMinutes: z.number().int().positive(),
  summary: z.string(),
  translation: z.string(),
  paragraphs: z.array(
    z.object({
      id: z.string(),
      sentences: z.array(sentenceSchema).min(1),
    }),
  ).min(1),
  vocabulary: z.array(
    z.object({
      lemma: z.string(),
      surface: z.string(),
      meaning: z.string(),
      phonetic: z.string().optional(),
      exampleSentenceId: z.string(),
    }),
  ).min(5).max(8),
  grammarPoints: z.array(
    z.object({
      title: z.string(),
      explanation: z.string(),
      sourceSentenceId: z.string(),
    }),
  ).min(1).max(3),
  difficultSentences: z.array(
    z.object({
      sentenceId: z.string(),
      breakdown: z.string(),
    }),
  ).min(1).max(3),
  quiz: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      choices: z.array(z.string()).length(4),
      correctIndex: z.number().int().min(0).max(3),
      explanation: z.string(),
    }),
  ).min(3).max(5),
});

export type Article = z.infer<typeof articleSchema>;
