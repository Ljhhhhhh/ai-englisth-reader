import { z } from 'zod';
import type { LlmDebugRecord } from '@/features/llm-debug/debug-types';
import { invokeGenerationStage } from './shared';

function hasMaxCharacters(value: string, max: number) {
  return Array.from(value).length <= max;
}

function truncateCharacters(value: string, max: number) {
  return Array.from(value).slice(0, max).join('');
}

const translationStageSchema = z.object({
  chinese_title: z.string().trim().min(1),
  list_summary_zh: z
    .string()
    .transform((value) => truncateCharacters(value.trim(), 100))
    .pipe(
      z
        .string()
        .min(1)
        .refine(
          (value) => hasMaxCharacters(value, 100),
          'list_summary_zh must be 100 characters or fewer',
        ),
    ),
  chinese_translation: z.string().trim().min(1),
  paragraph_translations: z.array(z.string().trim().min(1)).min(1),
});

export type TranslationStageResult = z.infer<typeof translationStageSchema>;

export async function generateTranslationStage(input: {
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
  return invokeGenerationStage<TranslationStageResult>({
    attemptDebugRecord: input.attemptDebugRecord,
    inputText: `请基于下面英文文章，输出中文标题、100 字内列表摘要、全文中文翻译、以及逐段译文。
要求：
1. 只输出一个 JSON 对象，不要输出 Markdown，不要输出解释性前言。
2. 必须输出 chinese_title、list_summary_zh、chinese_translation、paragraph_translations 这四个字段。
3. list_summary_zh 必须是 100 个中文字符以内的列表简介，适合展示在文章列表里；要简短、完整，绝不能超过 100 个字符。
4. chinese_translation 必须是整篇英文正文的完整中文翻译。
5. paragraph_translations 必须与英文段落一一对应，顺序一致，每一项只翻译对应段落。
6. 不要输出别的字段。

输出格式示例：
{"chinese_title":"系统如何协同工作","list_summary_zh":"用简短中文概括本文的核心观点，长度不超过100字。","chinese_translation":"全文中文翻译……","paragraph_translations":["第一段译文……","第二段译文……"]}

英文文章：
${input.articleText}`,
    jobId: input.jobId,
    onAttemptBoundary: input.onAttemptBoundary,
    onTextChunk: input.onTextChunk,
    prompt:
      '你是一位英语学习材料翻译助手。只输出一个 JSON 对象，字段必须为 chinese_title、list_summary_zh、chinese_translation、paragraph_translations。list_summary_zh 必须控制在 100 个中文字符以内。',
    schema: translationStageSchema,
    sourceRefLabel: `job:${input.jobId}:translation:${input.userId}`,
    sourceType: input.sourceType,
    stage: 'translation',
  });
}
