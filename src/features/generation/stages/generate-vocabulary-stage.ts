import { z } from 'zod';
import { memoryTypeSchema } from '@/lib/content/article-schema';
import type { LlmDebugRecord } from '@/features/llm-debug/debug-types';
import { invokeGenerationStage } from './shared';

const vocabularyStageSchema = z.object({
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
});

export type VocabularyStageResult = z.infer<typeof vocabularyStageSchema>;

export async function generateVocabularyStage(input: {
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
  return invokeGenerationStage<VocabularyStageResult>({
    attemptDebugRecord: input.attemptDebugRecord,
    inputText: `请基于下面英文文章，提取成长词汇和高频词组。
要求：
1. 只输出一个 JSON 对象，不要输出 Markdown，不要输出解释。
2. growth_vocabulary 必须是 4-6 个对象组成的数组；每个对象都必须包含 word、chinese_meaning、context_meaning、memory_type、memory_hook。
3. high_frequency_phrases 必须是 2-3 个对象组成的数组；每个对象都必须包含 phrase、chinese_meaning、usage_note。
4. growth_vocabulary 和 high_frequency_phrases 都不允许输出字符串数组，数组里的每一项都必须是对象。
5. 所有 word 和 phrase 都必须直接来自文章原文，不能改写。
6. memory_type 必须只使用这几个值之一：构词助记、核心意象助记、场景助记、搭配助记、近义辨析助记。
7. 不要输出别的字段。

输出格式示例：
{"growth_vocabulary":[{"word":"adapt","chinese_meaning":"适应","context_meaning":"适应新的环境或变化","memory_type":"场景助记","memory_hook":"把 adapt 想成在新环境里不断调整动作，慢慢适应节奏。"}],"high_frequency_phrases":[{"phrase":"in the long run","chinese_meaning":"从长远来看","usage_note":"常用于总结长期影响或长期收益。"}]}

英文文章：
${input.articleText}`,
    jobId: input.jobId,
    onAttemptBoundary: input.onAttemptBoundary,
    onTextChunk: input.onTextChunk,
    prompt:
      '你是一位英语精读教研助手。只输出一个 JSON 对象，字段必须为 growth_vocabulary 和 high_frequency_phrases。growth_vocabulary 必须是对象数组，不允许输出字符串数组；high_frequency_phrases 也必须是对象数组，不允许输出字符串数组。',
    schema: vocabularyStageSchema,
    sourceRefLabel: `job:${input.jobId}:vocabulary:${input.userId}`,
    sourceType: input.sourceType,
    stage: 'vocabulary',
  });
}
