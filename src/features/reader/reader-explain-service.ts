import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import type { Article } from '@/lib/content/article-schema';
import { env } from '@/lib/env';
import {
  type ReaderExplainMode,
  validateExplainSelection,
} from './reader-explain-utils';
import {
  findSentenceInArticle,
  lookupWordFromArticle,
} from './word-lookup-service';

const explainOutputSchema = z.object({
  meaning: z.string().min(1),
  contextMeaning: z.string().min(1),
  explanation: z.string().min(1),
  lemma: z.string().min(1).optional(),
  memoryHook: z.string().min(1).optional(),
  usageExample: z.string().min(1).optional(),
});

export type ReaderExplainResult = {
  mode: ReaderExplainMode;
  selectedText: string;
  meaning: string;
  contextMeaning: string;
  explanation: string;
  lemma?: string;
  memoryHook?: string;
  sourceSentence: string;
  usageExample?: string;
};

function buildSystemPrompt(mode: ReaderExplainMode) {
  if (mode === 'word') {
    return [
      '你是一个面向中文母语者的英文阅读讲解助手。',
      '你只解释当前句子里的这个英文单词。',
      '输出要短、准、贴合当前句子，不要扩展到整段，不要闲聊。',
      'meaning 写这个词的中文解释。',
      'contextMeaning 写它放进当前句子后的实际意思。',
      'explanation 写一句简短提醒，可以是辨析、误区或理解抓手。',
      'lemma 写这个词更适合保存到生词本的原形；拿不准时就沿用当前词形。',
      'memoryHook 写一句短助记。',
      'usageExample 写一个常用场景英文例句，并确保包含这个词。',
    ].join('\n');
  }

  return [
    '你是一个面向中文母语者的英文阅读讲解助手。',
    '你只解释当前句子里的这个英文短语。',
    '输出要简洁但比单词模式稍完整，不要扩展到整段，不要闲聊。',
    'meaning 写这个短语的整体翻译。',
    'contextMeaning 写它在当前句子里的实际含义。',
    'explanation 写简短拆解，说明为什么这里这样理解。',
  ].join('\n');
}

async function requestExplanation(input: {
  mode: ReaderExplainMode;
  selectedText: string;
  sentenceText: string;
  wordReference?: {
    chineseMeaning: string;
    contextMeaning: string;
  };
}) {
  if (!env.LLM_API_KEY) {
    throw new Error('LLM_API_KEY is required');
  }

  const llm = new ChatOpenAI({
    apiKey: env.LLM_API_KEY,
    configuration: {
      baseURL: env.LLM_BASE_URL,
    },
    model: env.LLM_MODEL,
    temperature: input.mode === 'word' ? 0.2 : 0.3,
  }).withStructuredOutput(explainOutputSchema);

  const referenceBlock = input.wordReference
    ? `\n站内参考释义：\n- 中文解释：${input.wordReference.chineseMeaning}\n- 语境意思：${input.wordReference.contextMeaning}\n`
    : '';

  return llm.invoke([
    new SystemMessage(buildSystemPrompt(input.mode)),
    new HumanMessage(
      `模式：${input.mode}\n当前句子：${input.sentenceText}\n选中内容：${input.selectedText}${referenceBlock}`,
    ),
  ]);
}

export async function explainReaderSelection(input: {
  article: Article;
  mode: ReaderExplainMode;
  selectedText: string;
  sentenceId: string;
  sentenceText: string;
}): Promise<ReaderExplainResult> {
  const sentence = findSentenceInArticle(input.article, input.sentenceId);

  if (!sentence) {
    throw new Error(`Sentence not found: ${input.sentenceId}`);
  }

  const validation = validateExplainSelection({
    mode: input.mode,
    selectedText: input.selectedText,
    sentenceText: sentence.text,
  });

  if (!validation.ok) {
    throw new Error(`Invalid selection: ${validation.reason}`);
  }

  const wordReference =
    input.mode === 'word'
      ? (() => {
          try {
            const result = lookupWordFromArticle({
              article: input.article,
              sentenceId: input.sentenceId,
              surface: validation.selectedText,
            });

            return {
              chineseMeaning: result.chineseMeaning,
              contextMeaning: result.contextMeaning,
            };
          } catch {
            return undefined;
          }
        })()
      : undefined;

  const response = await requestExplanation({
    mode: input.mode,
    selectedText: validation.selectedText,
    sentenceText: sentence.text,
    wordReference,
  });

  return {
    mode: input.mode,
    selectedText: validation.selectedText,
    meaning: response.meaning,
    contextMeaning: response.contextMeaning,
    explanation: response.explanation,
    lemma: response.lemma,
    memoryHook: response.memoryHook,
    sourceSentence: sentence.text,
    usageExample: response.usageExample,
  };
}
