import type { Article } from '@/lib/content/article-schema';
import { articleSchema } from '@/lib/content/article-schema';
import {
  parseFeynmanSummary,
  splitSummaryIntoSentences,
} from '@/features/generation/feynman-parser';
import type { EnglishStageResult } from './generate-english-stage';
import type { GrammarStageResult } from './generate-grammar-stage';
import type { TranslationStageResult } from './generate-translation-stage';
import type { VocabularyStageResult } from './generate-vocabulary-stage';

type BuildFinalArticleInput = {
  canonicalSource: string;
  canonicalTitleHint: string;
  english: EnglishStageResult;
  grammar: GrammarStageResult;
  reservedArticleSlug: string;
  translation: TranslationStageResult;
  vocabulary: VocabularyStageResult;
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
    const phraseParts = normalizedTerm.split(/\s+/).filter(Boolean);
    const joinPattern = phraseParts
      .map((part) => `${escapeRegExp(part)}[a-z]*`)
      .join('(?:[^a-z]+[a-z]+){0,3}[^a-z]+');

    return new RegExp(`(^|[^a-z])${joinPattern}([^a-z]|$)`, 'i').test(
      normalizedSummary,
    );
  }

  return new RegExp(
    `(^|[^a-z])${escapeRegExp(normalizedTerm)}([^a-z]|$)`,
    'i',
  ).test(normalizedSummary);
}

function estimateMinutes(summary: string) {
  const wordCount = summary.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(4, Math.ceil(wordCount / 110));
}

function inferDifficulty(input: {
  articleText: string;
  vocabularyCount: number;
}): Article['difficulty'] {
  const wordCount = input.articleText.trim().split(/\s+/).filter(Boolean).length;

  return wordCount >= 140 || input.vocabularyCount >= 5 ? 'B2' : 'B1';
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

function normalizeTitle(titleHint: string) {
  return titleHint.trim() || 'Generated Reading';
}

function resolveParagraphTranslations(
  translation: TranslationStageResult,
  paragraphCount: number,
) {
  const normalizedTranslations = translation.paragraph_translations
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (normalizedTranslations.length === paragraphCount) {
    return normalizedTranslations;
  }

  const fallbackTranslations = splitChineseParagraphs(
    translation.chinese_translation,
  );

  if (fallbackTranslations.length === paragraphCount) {
    return fallbackTranslations;
  }

  if (paragraphCount === 1 && translation.chinese_translation.trim()) {
    return [translation.chinese_translation.trim()];
  }

  throw new Error(
    `段落译文数量 (${normalizedTranslations.length}) 与正文段落数量 (${paragraphCount}) 不一致。`,
  );
}

export function buildFinalArticle(input: BuildFinalArticleInput) {
  const articleText = input.english.feynman_summary.trim();
  const paragraphs = parseFeynmanSummary(articleText);

  if (!paragraphs.length) {
    throw new Error('未能从英文正文解析出可阅读段落。');
  }
  const paragraphTranslations = resolveParagraphTranslations(
    input.translation,
    paragraphs.length,
  );

  const growthVocabulary = input.vocabulary.growth_vocabulary.filter((item) =>
    includesTerm(articleText, item.word),
  );
  const highFrequencyPhrases = input.vocabulary.high_frequency_phrases.filter((item) =>
    includesTerm(articleText, item.phrase),
  );

  if (growthVocabulary.length < 4) {
    throw new Error('生成结果中可用的成长词汇不足 4 个。');
  }

  if (highFrequencyPhrases.length < 2) {
    throw new Error('生成结果中可用的高频词组不足 2 个。');
  }

  return articleSchema.parse({
    chinese_title: input.translation.chinese_title.trim(),
    chinese_translation: input.translation.chinese_translation.trim(),
    difficulty: inferDifficulty({
      articleText,
      vocabularyCount: growthVocabulary.length,
    }),
    estimatedMinutes: estimateMinutes(articleText),
    feynman_summary: articleText,
    growth_vocabulary: growthVocabulary,
    high_frequency_phrases: highFrequencyPhrases,
    language_evolution: {
      ...input.grammar.language_evolution,
      rewritten_sentence: resolveRewrittenSentence(
        articleText,
        input.grammar.language_evolution.rewritten_sentence,
      ),
    },
    list_summary_zh: input.translation.list_summary_zh.trim(),
    paragraphs: paragraphs.map((paragraph, index) => ({
      ...paragraph,
      translation: paragraphTranslations[index] ?? '',
    })),
    slug: input.reservedArticleSlug,
    source: input.canonicalSource,
    title: normalizeTitle(input.canonicalTitleHint),
  });
}
