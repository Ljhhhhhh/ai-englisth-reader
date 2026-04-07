import type { Article } from '@/lib/content/article-schema';

function normalizeToken(value: string) {
  return value.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase();
}

function findSentence(article: Article, sentenceId: string) {
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
  const sentence = findSentence(article, sentenceId);

  if (!sentence) {
    throw new Error(`Sentence not found: ${sentenceId}`);
  }

  const vocabularyItem = article.vocabulary.find((item) => {
    const normalizedItemSurface = normalizeToken(item.surface);
    const normalizedLemma = normalizeToken(item.lemma);

    return (
      normalizedItemSurface === normalizedSurface ||
      normalizedLemma === normalizedSurface
    );
  });

  if (!vocabularyItem) {
    throw new Error(`Word not found in article vocabulary: ${surface}`);
  }

  return {
    articleSlug: article.slug,
    articleTitle: article.title,
    lemma: vocabularyItem.lemma,
    meaning: vocabularyItem.meaning,
    partOfSpeech: undefined,
    phonetic: vocabularyItem.phonetic,
    sentenceId,
    sourceSentence: sentence.text,
    surface: vocabularyItem.surface,
  };
}

export type WordLookupResult = ReturnType<typeof buildLookupResult>;

export function getLookupableWords(article: Article) {
  const lookupableWords = new Set<string>();

  for (const item of article.vocabulary) {
    lookupableWords.add(normalizeToken(item.surface));
    lookupableWords.add(normalizeToken(item.lemma));
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
