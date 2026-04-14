import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import type { Article } from '@/lib/content/article-schema';
import { env } from '@/lib/env';
import {
  type StructuredDebugInvokeResult,
  invokeStructuredWithDebug,
} from '@/features/llm-debug/capture';
import type { LlmDebugRecord } from '@/features/llm-debug/debug-types';
import {
  type ReaderExplainMode,
  validateExplainSelection,
} from './reader-explain-utils';
import {
  findSentenceInArticle,
  lookupWordFromArticle,
} from './word-lookup-service';

const wordExplainOutputSchema = z.object({
  meaning: z.string().min(1),
  contextMeaning: z.string().min(1),
  explanation: z.string().min(1),
  lemma: z.string().min(1),
  memoryHook: z.string().min(1),
  usageExample: z.string().min(1),
});

const phraseExplainOutputSchema = z.object({
  meaning: z.string().min(1),
  contextMeaning: z.string().min(1),
  explanation: z.string().min(1),
  phraseType: z.string().min(1).optional(),
  usageExample: z.string().min(1),
});

type WordExplainOutput = z.infer<typeof wordExplainOutputSchema>;
type PhraseExplainOutput = z.infer<typeof phraseExplainOutputSchema>;

type ExplainReaderSelectionOptions = {
  onDebugRecord?: (record: LlmDebugRecord) => void;
};

export type ReaderExplainResult = {
  mode: ReaderExplainMode;
  selectedText: string;
  meaning: string;
  contextMeaning: string;
  explanation: string;
  lemma?: string;
  memoryHook?: string;
  phraseType?: string;
  sourceSentence: string;
  usageExample?: string;
};

function buildSystemPrompt(mode: ReaderExplainMode) {
  if (mode === 'word') {
    return [
      '你是中文母语者的英文阅读讲解助手。只解释当前句子里的目标英文单词，不扩展整段，不闲聊。',
      '输入参数：currentSentence、targetWord、supplementalReference（可选）。',
      '要求：只结合 currentSentence 解释 targetWord；不翻译整句；只保留当前语境最合适的意思；contextMeaning 写句中实际义，不要只重复字典义；explanation 只写一句简短提醒；lemma 写适合记生词本的原形，不确定就保留原词形；memoryHook 写一句短助记；usageExample 必须包含 targetWord。',
      '输出语言：meaning、contextMeaning 必须以自然、简洁、对中文母语者友好的中文为主；explanation、memoryHook 默认也用中文，但在更利于理解或记忆时可以少量中英结合。不要把讲解主体写成整段英文。只有 usageExample 保持英文例句，lemma 保持英文原形。',
      '如果提供 supplementalReference，它只用于辅助校准；若与 currentSentence 冲突，一律以 currentSentence 为准。不要直接照抄 supplementalReference，而要按当前句子重新组织表达。',
      '只输出 JSON：{"meaning":"","contextMeaning":"","explanation":"","lemma":"","memoryHook":"","usageExample":""}',
    ].join('\n');
  }

  return [
    '你是中文母语者的英文阅读讲解助手。只解释当前句子里的目标英文短语，不扩展整段，不闲聊。',
    '输入参数：currentSentence、targetPhrase。',
    '要求：只结合 currentSentence 解释 targetPhrase；优先按整体理解，不要机械逐词翻译；不翻译整句；只保留当前语境最合适的意思；explanation 简要说明为什么这里这样理解；phraseType 可选：动词短语 / 固定搭配 / 介词短语 / 习惯表达 / 短语；usageExample 必须包含 targetPhrase。',
    '输出语言：meaning、contextMeaning、phraseType 必须以自然、简洁、对中文母语者友好的中文为主；explanation 默认也用中文，但在更利于理解或记忆时可以少量中英结合。不要把讲解主体写成整段英文。只有 usageExample 保持英文例句。',
    '只输出 JSON：{"meaning":"","contextMeaning":"","explanation":"","phraseType":"","usageExample":""}',
  ].join('\n');
}

function buildHumanMessage(input: {
  mode: ReaderExplainMode;
  selectedText: string;
  sentenceText: string;
  wordReference?: {
    chineseMeaning: string;
    contextMeaning: string;
  };
}) {
  const baseLines =
    input.mode === 'word'
      ? [
          `currentSentence: ${input.sentenceText}`,
          `targetWord: ${input.selectedText}`,
        ]
      : [
          `currentSentence: ${input.sentenceText}`,
          `targetPhrase: ${input.selectedText}`,
        ];

  if (!input.wordReference) {
    return baseLines.join('\n');
  }

  return [
    ...baseLines,
    'supplementalReference:',
    `referenceMeaning: ${input.wordReference.chineseMeaning}`,
    `referenceContextMeaning: ${input.wordReference.contextMeaning}`,
    'referencePolicy: 仅作参考；若与 currentSentence 冲突，以 currentSentence 为准。',
  ].join('\n');
}

async function requestExplanation(input: {
  mode: 'word';
  selectedText: string;
  sentenceText: string;
  wordReference?: {
    chineseMeaning: string;
    contextMeaning: string;
  };
}): Promise<StructuredDebugInvokeResult<WordExplainOutput>>;
async function requestExplanation(input: {
  mode: 'phrase';
  selectedText: string;
  sentenceText: string;
  wordReference?: {
    chineseMeaning: string;
    contextMeaning: string;
  };
}): Promise<StructuredDebugInvokeResult<PhraseExplainOutput>>;
async function requestExplanation(input: {
  mode: ReaderExplainMode;
  selectedText: string;
  sentenceText: string;
  wordReference?: {
    chineseMeaning: string;
    contextMeaning: string;
  };
}): Promise<
  StructuredDebugInvokeResult<WordExplainOutput | PhraseExplainOutput>
> {
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
  });

  const result = await invokeStructuredWithDebug<
    WordExplainOutput | PhraseExplainOutput
  >({
    llm,
    messages: [
      new SystemMessage(buildSystemPrompt(input.mode)),
      new HumanMessage(buildHumanMessage(input)),
    ],
    schema:
      input.mode === 'word' ? wordExplainOutputSchema : phraseExplainOutputSchema,
    summary: {
      callType: input.mode,
      model: env.LLM_MODEL,
      selectedText: input.selectedText,
      trigger: 'reader_panel',
    },
  });

  return result;
}

export async function explainReaderSelection(input: {
  article: Article;
  mode: ReaderExplainMode;
  selectedText: string;
  sentenceId: string;
  sentenceText: string;
}, options: ExplainReaderSelectionOptions = {}): Promise<ReaderExplainResult> {
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

  if (input.mode === 'word') {
    const response = await requestExplanation({
      mode: 'word',
      selectedText: validation.selectedText,
      sentenceText: sentence.text,
      wordReference,
    });
    const record = {
      ...response.record,
      summary: {
        ...response.record.summary,
        sentenceId: input.sentenceId,
      },
    } satisfies LlmDebugRecord;
    options.onDebugRecord?.(record);

    if (response.error || response.parsed === null) {
      throw response.error ?? new Error('LLM structured output parse failed.');
    }

    return {
      mode: 'word',
      selectedText: validation.selectedText,
      meaning: response.parsed.meaning,
      contextMeaning: response.parsed.contextMeaning,
      explanation: response.parsed.explanation,
      lemma: response.parsed.lemma,
      memoryHook: response.parsed.memoryHook,
      sourceSentence: sentence.text,
      usageExample: response.parsed.usageExample,
    };
  }

  const response = await requestExplanation({
    mode: 'phrase',
    selectedText: validation.selectedText,
    sentenceText: sentence.text,
  });
  const record = {
    ...response.record,
    summary: {
      ...response.record.summary,
      sentenceId: input.sentenceId,
    },
  } satisfies LlmDebugRecord;
  options.onDebugRecord?.(record);

  if (response.error || response.parsed === null) {
    throw response.error ?? new Error('LLM structured output parse failed.');
  }

  return {
    mode: 'phrase',
    selectedText: validation.selectedText,
    meaning: response.parsed.meaning,
    contextMeaning: response.parsed.contextMeaning,
    explanation: response.parsed.explanation,
    phraseType: response.parsed.phraseType,
    sourceSentence: sentence.text,
    usageExample: response.parsed.usageExample,
  };
}
