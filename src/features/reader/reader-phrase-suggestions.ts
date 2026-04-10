import type { Article } from '@/lib/content/article-schema';

export type ReaderPhraseSuggestion = {
  text: string;
  reason: string;
};

function tokenizeWords(value: string) {
  return value.match(/[A-Za-z]+(?:'[A-Za-z]+)*/g) ?? [];
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

const weakEdgeWords = new Set([
  'a',
  'an',
  'and',
  'but',
  'for',
  'if',
  'of',
  'or',
  'the',
  'to',
  'when',
  'with',
]);

const weakStartWords = new Set(['and', 'but', 'for', 'if', 'or', 'to', 'when', 'with']);

function uniqueSuggestions(items: ReaderPhraseSuggestion[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = normalize(item.text);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildAdjacentSuggestions(
  sentenceWords: string[],
  selectedIndex: number,
) {
  const suggestions: ReaderPhraseSuggestion[] = [];

  const pushWindow = (start: number, end: number, reason: string) => {
    if (start < 0 || end > sentenceWords.length || end - start < 2) {
      return;
    }

    const words = sentenceWords.slice(start, end);
    const firstWord = normalize(words[0] ?? '');
    const lastWord = normalize(words[words.length - 1] ?? '');
    const hasWeakMiddleWord =
      words.length >= 3 &&
      words.slice(1, -1).some((word) => weakEdgeWords.has(normalize(word)));

    if (weakStartWords.has(firstWord) || weakEdgeWords.has(lastWord) || hasWeakMiddleWord) {
      return;
    }

    suggestions.push({
      text: words.join(' '),
      reason,
    });
  };

  pushWindow(selectedIndex - 1, selectedIndex + 1, '顺手一起看更好懂');
  pushWindow(selectedIndex, selectedIndex + 2, '和当前词放在一起更清楚');
  pushWindow(selectedIndex, selectedIndex + 3, '和当前词放在一起更清楚');
  pushWindow(selectedIndex + 1, selectedIndex + 3, '就在这个词附近');
  pushWindow(selectedIndex + 2, selectedIndex + 4, '就在这个词附近');
  pushWindow(selectedIndex + 3, selectedIndex + 5, '就在这个词附近');

  return suggestions;
}

export function getPhraseSuggestionsForWord(input: {
  article: Article;
  sentenceId: string;
  sentenceText: string;
  selectedWord: string;
}) {
  const sentenceWords = tokenizeWords(input.sentenceText);
  const selectedIndex = sentenceWords.findIndex(
    (word) => normalize(word) === normalize(input.selectedWord),
  );

  if (selectedIndex === -1) {
    return [] as ReaderPhraseSuggestion[];
  }

  const articleMatches = input.article.high_frequency_phrases
    .filter((item) =>
      normalize(input.sentenceText).includes(normalize(item.phrase)),
    )
    .map((item) => ({
      text: item.phrase,
      reason: '这句里的高频短语',
    }));

  const adjacentMatches = buildAdjacentSuggestions(sentenceWords, selectedIndex);

  return uniqueSuggestions([...articleMatches, ...adjacentMatches]).slice(0, 3);
}
