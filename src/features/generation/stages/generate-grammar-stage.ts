import { z } from 'zod';
import type { LlmDebugRecord } from '@/features/llm-debug/debug-types';
import { invokeGenerationStage } from './shared';

const grammarStageSchema = z.object({
  language_evolution: z.object({
    target_structure: z.string(),
    rewritten_sentence: z.string(),
    explanation: z.string(),
    imitation_example: z.string(),
  }),
});

export type GrammarStageResult = z.infer<typeof grammarStageSchema>;

export async function generateGrammarStage(input: {
  articleText: string;
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
  sourceType?: 'url' | 'file';
  userId: string;
}) {
  return invokeGenerationStage<GrammarStageResult>({
    attemptDebugRecord: input.attemptDebugRecord,
    inputText: `请基于下面英文文章，找出 1 个最适合接近 CET-4 学习者讲解的语法知识点。
要求：
1. 只输出一个 JSON 对象，不要输出 Markdown，不要输出解释性前言。
2. 必须输出 language_evolution 对象。
3. language_evolution 对象必须同时包含 target_structure、rewritten_sentence、explanation、imitation_example 这四个字段，四个字段都不能缺失，值都必须是字符串。
4. rewritten_sentence 必须逐字摘自文章原文，不能改写。
5. target_structure 要直接说明语法点名称，例如“现在分词作状语”或“that 引导宾语从句”。
6. explanation 要用中文解释这个语法点在本文里的作用。
7. imitation_example 要额外给出一个新的英文例句，帮助用户模仿。
8. 不要输出别的字段。

输出格式示例：
{"language_evolution":{"target_structure":"现在分词作状语","rewritten_sentence":"Knowing the risk, she moved carefully.","explanation":"这里用现在分词短语说明主句动作发生时的背景，让表达更紧凑。","imitation_example":"Seeing the storm coming, they closed the windows early."}}

英文文章：
${input.articleText}`,
    jobId: input.jobId,
    onAttemptBoundary: input.onAttemptBoundary,
    onTextChunk: input.onTextChunk,
    prompt:
      '你是一位英语语法教研助手。只输出一个 JSON 对象，字段必须为 language_evolution。language_evolution 里的四个字段都必须输出：target_structure、rewritten_sentence、explanation、imitation_example。',
    schema: grammarStageSchema,
    sourceRefLabel: `job:${input.jobId}:grammar:${input.userId}`,
    sourceType: input.sourceType,
    stage: 'grammar',
  });
}
