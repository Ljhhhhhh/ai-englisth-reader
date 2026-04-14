import { z } from 'zod';
import type { LlmDebugRecord } from '@/features/llm-debug/debug-types';
import { invokeGenerationStage } from './shared';

const englishStageSchema = z.object({
  feynman_summary: z.string().trim().min(1),
});

export type EnglishStageResult = z.infer<typeof englishStageSchema>;

export async function generateEnglishStage(input: {
  attemptDebugRecord?: (record: LlmDebugRecord) => void;
  jobId: string;
  onAttemptBoundary?: (input: {
    attempt: number;
    stage: string;
    status: 'started' | 'retrying';
  }) => void;
  onTextChunk?: (input: {
    accumulatedText: string;
    attempt: number;
    chunk: string;
  }) => void;
  sourceRefLabel: string;
  sourceType?: 'url' | 'file';
  sourceText: string;
}) {
  return invokeGenerationStage<EnglishStageResult>({
    attemptDebugRecord: input.attemptDebugRecord,
    inputText: `请把下面原文重写成一篇适合接近 CET-4 学习者的英文精读短文。\n要求：保持原文视角和论述重心；控制在 230 个英文单词以内；输出 2-4 个自然段；不要输出词汇、语法、翻译，只输出英文正文字段。\n\n原文：\n${input.sourceText}`,
    jobId: input.jobId,
    onAttemptBoundary: input.onAttemptBoundary,
    onTextChunk: input.onTextChunk,
    prompt: '你是一位高质量英语学习材料重写器。只输出一个 JSON 对象，字段必须为 feynman_summary。',
    schema: englishStageSchema,
    sourceRefLabel: input.sourceRefLabel,
    sourceType: input.sourceType,
    stage: 'english',
  });
}
