import type { Article } from '@/lib/content/article-schema';

function normalizeToken(value: string) {
  return value.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase();
}

export function findSentenceInArticle(article: Article, sentenceId: string) {
  for (const paragraph of article.paragraphs) {
    for (const sentence of paragraph.sentences) {
      if (sentence.id === sentenceId) {
        return sentence;
      }
    }
  }

  return null;
}

function buildLookupResult(
  article: Article,
  surface: string,
  sentenceId: string,
) {
  const normalizedSurface = normalizeToken(surface);
  const sentence = findSentenceInArticle(article, sentenceId);

  if (!sentence) {
    throw new Error(`Sentence not found: ${sentenceId}`);
  }

  const vocabularyItem = article.growth_vocabulary.find(
    (item) => normalizeToken(item.word) === normalizedSurface,
  );

  if (!vocabularyItem) {
    throw new Error(`Word not found in article growth vocabulary: ${surface}`);
  }

  return {
    articleSlug: article.slug,
    articleTitle: article.title,
    chineseMeaning: vocabularyItem.chinese_meaning,
    contextMeaning: vocabularyItem.context_meaning,
    lemma: vocabularyItem.word,
    memoryHook: vocabularyItem.memory_hook,
    memoryType: vocabularyItem.memory_type,
    sentenceId,
    sourceSentence: sentence.text,
    surface: vocabularyItem.word,
  };
}

export type WordLookupResult = ReturnType<typeof buildLookupResult>;

export function getLookupableWords(article: Article) {
  const lookupableWords = new Set<string>();

  for (const item of article.growth_vocabulary) {
    lookupableWords.add(normalizeToken(item.word));
  }

  return lookupableWords;
}

export function lookupWordFromArticle(input: {
  article: Article;
  sentenceId: string;
  surface: string;
}) {
  return buildLookupResult(input.article, input.surface, input.sentenceId);
}
