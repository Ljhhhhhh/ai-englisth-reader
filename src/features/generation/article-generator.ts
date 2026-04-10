import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import type { Article } from '@/lib/content/article-schema';
import { articleSchema } from '@/lib/content/article-schema';
import { env } from '@/lib/env';
import {
  parseFeynmanSummary,
  splitSummaryIntoSentences,
} from './feynman-parser';
import { loadPrompt } from './load-prompt';
import { type PromptOutput, promptOutputSchema } from './prompt-output-schema';

type GenerateArticleInput = {
  source: string;
  text: string;
  titleHint: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function splitChineseParagraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function includesTerm(summary: string, term: string) {
  const normalizedSummary = normalizeWhitespace(summary).toLowerCase();
  const normalizedTerm = normalizeWhitespace(term).toLowerCase();

  if (!normalizedTerm) {
    return false;
  }

  if (normalizedTerm.includes(' ')) {
    return normalizedSummary.includes(normalizedTerm);
  }

  return new RegExp(
    `(^|[^a-z])${escapeRegExp(normalizedTerm)}([^a-z]|$)`,
    'i',
  ).test(normalizedSummary);
}

function resolveRewrittenSentence(summary: string, candidate: string) {
  if (summary.includes(candidate)) {
    return candidate;
  }

  const normalizedCandidate = normalizeWhitespace(candidate).toLowerCase();
  const sentences = splitSummaryIntoSentences(summary);
  const exactMatch = sentences.find(
    (sentence) =>
      normalizeWhitespace(sentence).toLowerCase() === normalizedCandidate,
  );

  if (exactMatch) {
    return exactMatch;
  }

  const candidateTokens = new Set(
    normalizedCandidate.split(/[^a-z]+/).filter(Boolean),
  );

  let bestSentence = sentences[0] ?? candidate;
  let bestScore = 0;

  for (const sentence of sentences) {
    const sentenceTokens = sentence
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean);
    const overlap = sentenceTokens.filter((token) =>
      candidateTokens.has(token),
    ).length;
    const score = overlap / Math.max(candidateTokens.size, 1);

    if (score > bestScore) {
      bestScore = score;
      bestSentence = sentence;
    }
  }

  return bestSentence;
}

function estimateMinutes(summary: string) {
  const wordCount = summary.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(4, Math.ceil(wordCount / 110));
}

function inferDifficulty(payload: PromptOutput): Article['difficulty'] {
  const wordCount = payload.feynman_summary
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return wordCount >= 140 || payload.growth_vocabulary.length >= 5
    ? 'B2'
    : 'B1';
}

function normalizeTitle(titleHint: string) {
  return titleHint.trim() || 'Generated Reading';
}

function resolveParagraphTranslations(
  payload: PromptOutput,
  paragraphCount: number,
) {
  const normalizedTranslations = payload.paragraph_translations
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (normalizedTranslations.length === paragraphCount) {
    return normalizedTranslations;
  }

  const fallbackTranslations = splitChineseParagraphs(payload.chinese_translation);

  if (fallbackTranslations.length === paragraphCount) {
    return fallbackTranslations;
  }

  if (paragraphCount === 1 && payload.chinese_translation.trim()) {
    return [payload.chinese_translation.trim()];
  }

  throw new Error(
    `段落译文数量 (${normalizedTranslations.length}) 与正文段落数量 (${paragraphCount}) 不一致。`,
  );
}

function slugify(input: string) {
  const ascii = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return ascii || 'generated-reading';
}

function buildArticle(
  payload: PromptOutput,
  input: GenerateArticleInput,
): Article {
  const normalizedPayload: PromptOutput = {
    ...payload,
    chinese_title: payload.chinese_title.trim(),
    list_summary_zh: payload.list_summary_zh.trim(),
    chinese_translation: payload.chinese_translation.trim(),
    paragraph_translations: payload.paragraph_translations
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    feynman_summary: payload.feynman_summary.trim(),
    growth_vocabulary: payload.growth_vocabulary.filter((item) =>
      includesTerm(payload.feynman_summary, item.word),
    ),
    high_frequency_phrases: payload.high_frequency_phrases.filter((item) =>
      includesTerm(payload.feynman_summary, item.phrase),
    ),
    language_evolution: {
      ...payload.language_evolution,
      rewritten_sentence: resolveRewrittenSentence(
        payload.feynman_summary,
        payload.language_evolution.rewritten_sentence,
      ),
    },
  };

  if (normalizedPayload.growth_vocabulary.length < 4) {
    throw new Error('生成结果中可用的成长词汇不足 4 个。');
  }

  if (normalizedPayload.high_frequency_phrases.length < 2) {
    throw new Error('生成结果中可用的高频词组不足 2 个。');
  }

  const slugBase = slugify(input.titleHint || input.source);
  const slug = `${slugBase}-${randomUUID().slice(0, 6)}`;
  const paragraphs = parseFeynmanSummary(normalizedPayload.feynman_summary);

  if (!paragraphs.length) {
    throw new Error('未能从 feynman_summary 解析出可阅读段落。');
  }

  const paragraphTranslations = resolveParagraphTranslations(
    normalizedPayload,
    paragraphs.length,
  );

  return articleSchema.parse({
    slug,
    title: normalizeTitle(input.titleHint),
    chinese_title: normalizedPayload.chinese_title,
    source: input.source,
    difficulty: inferDifficulty(normalizedPayload),
    estimatedMinutes: estimateMinutes(normalizedPayload.feynman_summary),
    list_summary_zh: normalizedPayload.list_summary_zh,
    feynman_summary: normalizedPayload.feynman_summary,
    chinese_translation:
      normalizedPayload.chinese_translation ||
      paragraphTranslations.join('\n\n'),
    paragraphs: paragraphs.map((paragraph, index) => ({
      ...paragraph,
      translation: paragraphTranslations[index] ?? '',
    })),
    growth_vocabulary: normalizedPayload.growth_vocabulary,
    high_frequency_phrases: normalizedPayload.high_frequency_phrases,
    language_evolution: normalizedPayload.language_evolution,
  });
}

async function writeGeneratedArticle(article: Article) {
  const articlesDir = path.join(process.cwd(), 'content', 'articles');
  await mkdir(articlesDir, { recursive: true });
  await writeFile(
    path.join(articlesDir, `${article.slug}.json`),
    `${JSON.stringify(article, null, 2)}\n`,
    'utf8',
  );
}

async function invokeModel(text: string) {
  if (!env.LLM_API_KEY) {
    throw new Error('缺少 LLM_API_KEY，暂时无法生成文章。');
  }

  const llm = new ChatOpenAI({
    apiKey: env.LLM_API_KEY,
    configuration: {
      baseURL: env.LLM_BASE_URL,
    },
    model: env.LLM_MODEL,
    temperature: 0.3,
  }).withStructuredOutput(promptOutputSchema);

  const prompt = await loadPrompt();

  return llm.invoke([
    new SystemMessage(prompt),
    new HumanMessage(`请处理以下原文：\n\n${text}`),
  ]);
}

export async function generateArticle(input: GenerateArticleInput) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const payload = await invokeModel(input.text);
      const article = buildArticle(payload, input);

      await writeGeneratedArticle(article);
      return article;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('文章生成失败，请稍后重试。');
}
